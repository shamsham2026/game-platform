import { prisma } from "@/lib/db";
import { recommendTopics } from "@/lib/recommend";

/** ISO week-ish helper: school week number from plan + date. */
export function schoolWeekNumber(from: Date, yearStart: Date): number {
  const ms = from.getTime() - yearStart.getTime();
  const week = Math.floor(ms / (7 * 24 * 60 * 60 * 1000)) + 1;
  return Math.max(1, Math.min(40, week));
}

export async function getLoginRecommendations(studentId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { classRoom: { include: { grade: true } } },
  });
  if (!student) throw new Error("學生不存在");

  const plan = await prisma.progressPlan.findFirst({
    where: { gradeId: student.classRoom.gradeId },
    orderBy: { createdAt: "desc" },
    include: {
      items: { include: { topic: true } },
    },
  });

  const mastery = await prisma.masterySnapshot.findMany({
    where: { studentId },
  });

  const edges = await prisma.connectionEdge.findMany({
    where: { relation: "prerequisite" },
  });

  const topics = await prisma.topic.findMany({
    where: { subject: { gradeId: student.classRoom.gradeId }, isActive: true },
    select: { id: true, title: true },
  });
  const topicTitles = Object.fromEntries(topics.map((t) => [t.id, t.title]));

  const yearStart = new Date(new Date().getFullYear(), 8, 1); // assume Sep start
  const currentWeek = schoolWeekNumber(new Date(), yearStart);

  const recommendations = recommendTopics({
    currentWeek,
    planTopics:
      plan?.items.map((i) => ({
        topicId: i.topicId,
        weekNo: i.weekNo,
        title: i.topic.title,
      })) ?? [],
    mastery: mastery.map((m) => ({
      topicId: m.topicId,
      score: m.score,
      lastPracticedAt: m.lastPracticedAt?.toISOString() ?? null,
      attemptCount: m.attemptCount,
    })),
    edges: edges.map((e) => ({
      fromTopicId: e.fromTopicId,
      toTopicId: e.toTopicId,
      relation: e.relation,
    })),
    topicTitles,
    limit: 5,
  });

  return {
    student: {
      id: student.id,
      studentNo: student.studentNo,
      displayName: student.displayName,
      classCode: student.classRoom.code,
      gradeCode: student.classRoom.grade.code,
    },
    currentWeek,
    recommendations,
  };
}
