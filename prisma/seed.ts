import {
  PrismaClient,
  ReviewStatus,
  GameKind,
} from "@prisma/client";
import { exerciseContentHash } from "../src/lib/normalize";

const prisma = new PrismaClient();

async function main() {
  await prisma.attempt.deleteMany();
  await prisma.sessionItem.deleteMany();
  await prisma.practiceSession.deleteMany();
  await prisma.masterySnapshot.deleteMany();
  await prisma.exercise.deleteMany();
  await prisma.connectionEdge.deleteMany();
  await prisma.progressPlanItem.deleteMany();
  await prisma.progressPlan.deleteMany();
  await prisma.learningObjective.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.domain.deleteMany();
  await prisma.student.deleteMany();
  await prisma.classRoom.deleteMany();
  await prisma.gameTemplate.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.gradeLevel.deleteMany();

  const grade = await prisma.gradeLevel.create({
    data: { code: "P4", name: "小學四年級", sortOrder: 4 },
  });

  const subject = await prisma.subject.create({
    data: { gradeId: grade.id, code: "MATH", name: "數學" },
  });

  const domain = await prisma.domain.create({
    data: { subjectId: subject.id, code: "NA", name: "數與代數" },
  });

  const topicFractions = await prisma.topic.create({
    data: {
      subjectId: subject.id,
      domainId: domain.id,
      code: "M4-F1",
      title: "分數的加減",
      objectivesLocked: true,
      objectives: {
        create: [
          {
            code: "O1",
            text: "能計算同分母分數的加法與減法",
            sortOrder: 1,
          },
          {
            code: "O2",
            text: "能解決與分數加減相關的簡單應用題",
            sortOrder: 2,
          },
        ],
      },
    },
  });

  const topicDecimals = await prisma.topic.create({
    data: {
      subjectId: subject.id,
      domainId: domain.id,
      code: "M4-D1",
      title: "小數的認識",
      objectivesLocked: true,
      objectives: {
        create: [
          {
            code: "O1",
            text: "能讀寫一位小數並理解其意義",
            sortOrder: 1,
          },
        ],
      },
    },
  });

  await prisma.connectionEdge.create({
    data: {
      fromTopicId: topicDecimals.id,
      toTopicId: topicFractions.id,
      relation: "related",
      weight: 0.8,
    },
  });

  const week = Math.max(
    1,
    Math.min(
      40,
      Math.floor(
        (Date.now() - new Date(new Date().getFullYear(), 8, 1).getTime()) /
          (7 * 24 * 60 * 60 * 1000),
      ) + 1,
    ),
  );

  const plan = await prisma.progressPlan.create({
    data: {
      gradeId: grade.id,
      subjectId: subject.id,
      schoolYear: String(new Date().getFullYear()),
      name: "default",
      items: {
        create: [
          {
            topicId: topicFractions.id,
            weekNo: week,
            suggestedMinutes: 20,
            note: "本週重點",
          },
          {
            topicId: topicDecimals.id,
            weekNo: Math.max(1, week - 1),
            suggestedMinutes: 15,
          },
        ],
      },
    },
  });

  const quiz = await prisma.gameTemplate.create({
    data: {
      kind: GameKind.quiz,
      name: "選擇挑戰",
      description: "隨機選擇題",
    },
  });

  await prisma.gameTemplate.create({
    data: {
      kind: GameKind.match,
      name: "概念連線",
      description: "配對／連線遊戲",
    },
  });

  const bank = [
    {
      stem: "1/4 + 2/4 = ?",
      options: [
        { id: "a", text: "3/4" },
        { id: "b", text: "2/4" },
        { id: "c", text: "3/8" },
      ],
      answer: { correctId: "a" },
      topicId: topicFractions.id,
    },
    {
      stem: "3/5 − 1/5 = ?",
      options: [
        { id: "a", text: "2/5" },
        { id: "b", text: "4/5" },
        { id: "c", text: "2/10" },
      ],
      answer: { correctId: "a" },
      topicId: topicFractions.id,
    },
    {
      stem: "2/7 + 3/7 = ?",
      options: [
        { id: "a", text: "5/7" },
        { id: "b", text: "5/14" },
        { id: "c", text: "6/7" },
      ],
      answer: { correctId: "a" },
      topicId: topicFractions.id,
    },
    {
      stem: "小明吃了披薩的 1/8，小華吃了 3/8，二人一共吃了多少？",
      options: [
        { id: "a", text: "4/8" },
        { id: "b", text: "3/8" },
        { id: "c", text: "4/16" },
      ],
      answer: { correctId: "a" },
      topicId: topicFractions.id,
    },
    {
      stem: "5/9 − 2/9 = ?",
      options: [
        { id: "a", text: "3/9" },
        { id: "b", text: "7/9" },
        { id: "c", text: "3/18" },
      ],
      answer: { correctId: "a" },
      topicId: topicFractions.id,
    },
    {
      stem: "0.3 讀作？",
      options: [
        { id: "a", text: "十分之三" },
        { id: "b", text: "百分之三" },
        { id: "c", text: "千分之三" },
      ],
      answer: { correctId: "a" },
      topicId: topicDecimals.id,
    },
    {
      stem: "哪一個等於 0.5？",
      options: [
        { id: "a", text: "5/10" },
        { id: "b", text: "5/100" },
        { id: "c", text: "1/5" },
      ],
      answer: { correctId: "a" },
      topicId: topicDecimals.id,
    },
  ];

  for (const row of bank) {
    const { normalizedStem, contentHash } = exerciseContentHash(
      row.stem,
      row.answer,
    );
    await prisma.exercise.create({
      data: {
        topicId: row.topicId,
        domainId: domain.id,
        templateId: quiz.id,
        stem: row.stem,
        normalizedStem,
        contentHash,
        optionsJson: JSON.stringify(row.options),
        answerJson: JSON.stringify(row.answer),
        difficulty: 1,
        reviewStatus: ReviewStatus.approved,
      },
    });
  }

  const classRoom = await prisma.classRoom.create({
    data: {
      gradeId: grade.id,
      code: "4A",
      name: "四年級甲班",
    },
  });

  await prisma.student.createMany({
    data: [
      { classId: classRoom.id, studentNo: "01", displayName: "陳同學" },
      { classId: classRoom.id, studentNo: "02", displayName: "李同學" },
    ],
  });

  console.log("Seed OK", {
    grade: grade.code,
    classCode: classRoom.code,
    students: ["01", "02"],
    planId: plan.id,
    week,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
