import { ReviewStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  pickRandomExercises,
  shuffleOptionOrder,
} from "@/lib/random-session";
import { updateMasteryScore } from "@/lib/recommend";

export async function startPracticeSession(opts: {
  studentId: string;
  topicIds: string[];
  count?: number;
  templateId?: string;
}) {
  const count = opts.count ?? 8;

  const exercises = await prisma.exercise.findMany({
    where: {
      topicId: { in: opts.topicIds },
      reviewStatus: ReviewStatus.approved,
      isActive: true,
    },
    select: { id: true, optionsJson: true },
  });

  const recentSessions = await prisma.practiceSession.findMany({
    where: { studentId: opts.studentId },
    orderBy: { startedAt: "desc" },
    take: 5,
    include: { items: { select: { exerciseId: true } } },
  });
  const recentExerciseIds = recentSessions.flatMap((s) =>
    s.items.map((i) => i.exerciseId),
  );

  const picked = pickRandomExercises({
    studentId: opts.studentId,
    topicIds: opts.topicIds,
    exerciseIds: exercises.map((e) => e.id),
    recentExerciseIds,
    count,
  });

  const byId = new Map(exercises.map((e) => [e.id, e]));

  const session = await prisma.practiceSession.create({
    data: {
      studentId: opts.studentId,
      templateId: opts.templateId,
      rngSeed: picked.rngSeed,
      topicIdsJson: JSON.stringify(opts.topicIds),
      items: {
        create: picked.selectedIds.map((exerciseId, position) => {
          const ex = byId.get(exerciseId)!;
          const options = JSON.parse(ex.optionsJson) as { id: string }[];
          const optionIds = options.map((o) => o.id);
          const order = shuffleOptionOrder(
            optionIds,
            picked.rngSeed,
            position,
          );
          return {
            exerciseId,
            position,
            optionOrderJson: JSON.stringify(order),
          };
        }),
      },
    },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: {
          exercise: {
            select: {
              id: true,
              stem: true,
              optionsJson: true,
              matchPairsJson: true,
              topicId: true,
              difficulty: true,
            },
          },
        },
      },
    },
  });

  // Strip answers from client payload
  return {
    id: session.id,
    rngSeed: session.rngSeed,
    items: session.items.map((item) => {
      const options = JSON.parse(item.exercise.optionsJson) as {
        id: string;
        text: string;
      }[];
      const order = JSON.parse(item.optionOrderJson) as string[];
      const ordered = order
        .map((id) => options.find((o) => o.id === id))
        .filter(Boolean);
      return {
        position: item.position,
        sessionItemId: item.id,
        exerciseId: item.exercise.id,
        topicId: item.exercise.topicId,
        stem: item.exercise.stem,
        difficulty: item.exercise.difficulty,
        options: ordered,
        matchPairs: item.exercise.matchPairsJson
          ? JSON.parse(item.exercise.matchPairsJson)
          : null,
      };
    }),
  };
}

export async function submitAttempt(opts: {
  sessionItemId: string;
  response: unknown;
  timeMs?: number;
}) {
  const item = await prisma.sessionItem.findUnique({
    where: { id: opts.sessionItemId },
    include: {
      exercise: true,
      session: true,
      attempt: true,
    },
  });
  if (!item) throw new Error("題目不存在");
  if (item.attempt) throw new Error("此題已作答");

  const answer = JSON.parse(item.exercise.answerJson) as { correctId?: string; value?: unknown };
  let isCorrect = false;
  if (answer.correctId !== undefined) {
    isCorrect =
      typeof opts.response === "object" &&
      opts.response !== null &&
      "selectedId" in opts.response &&
      (opts.response as { selectedId: string }).selectedId === answer.correctId;
  } else {
    isCorrect =
      JSON.stringify(opts.response) === JSON.stringify(answer.value ?? answer);
  }

  const attempt = await prisma.attempt.create({
    data: {
      sessionItemId: opts.sessionItemId,
      responseJson: JSON.stringify(opts.response),
      isCorrect,
      timeMs: opts.timeMs,
    },
  });

  const topicId = item.exercise.topicId;
  const studentId = item.session.studentId;
  const prev = await prisma.masterySnapshot.findUnique({
    where: { studentId_topicId: { studentId, topicId } },
  });
  const attemptCount = (prev?.attemptCount ?? 0) + 1;
  const correctCount = (prev?.correctCount ?? 0) + (isCorrect ? 1 : 0);
  const score = updateMasteryScore(prev?.score ?? 0, isCorrect, attemptCount);

  await prisma.masterySnapshot.upsert({
    where: { studentId_topicId: { studentId, topicId } },
    create: {
      studentId,
      topicId,
      attemptCount,
      correctCount,
      score,
      lastPracticedAt: new Date(),
    },
    update: {
      attemptCount,
      correctCount,
      score,
      lastPracticedAt: new Date(),
    },
  });

  return { attemptId: attempt.id, isCorrect, masteryScore: score };
}
