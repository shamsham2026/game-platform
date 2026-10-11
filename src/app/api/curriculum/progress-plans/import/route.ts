import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { reconcileProgressImport } from "@/lib/curriculum-guards";

const rowSchema = z.object({
  topicCode: z.string(),
  weekNo: z.number().int().min(1).max(52),
  suggestedMinutes: z.number().int().optional(),
  note: z.string().optional(),
  objectiveTextCheck: z
    .array(z.object({ code: z.string(), text: z.string() }))
    .optional(),
});

const bodySchema = z.object({
  gradeCode: z.string(),
  subjectCode: z.string(),
  schoolYear: z.string(),
  name: z.string().default("default"),
  rows: z.array(rowSchema).min(1),
});

/**
 * Upload grade progress schedule.
 * Never modifies locked learning objectives — mismatches become warnings.
 */
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "匯入格式錯誤" }, { status: 400 });
  }

  const grade = await prisma.gradeLevel.findUnique({
    where: { code: parsed.data.gradeCode },
  });
  if (!grade) {
    return NextResponse.json({ error: "找不到年級" }, { status: 404 });
  }

  const subject = await prisma.subject.findUnique({
    where: {
      gradeId_code: { gradeId: grade.id, code: parsed.data.subjectCode },
    },
  });
  if (!subject) {
    return NextResponse.json({ error: "找不到科目" }, { status: 404 });
  }

  const topics = await prisma.topic.findMany({
    where: { subjectId: subject.id },
    include: { objectives: true },
  });
  const topicByCode = new Map(topics.map((t) => [t.code, t]));
  const objectivesMap = new Map(
    topics.map((t) => [
      t.code,
      t.objectives.map((o) => ({ code: o.code, text: o.text })),
    ]),
  );

  const { accepted, warnings } = reconcileProgressImport(
    parsed.data.rows,
    objectivesMap,
  );

  const plan = await prisma.progressPlan.upsert({
    where: {
      gradeId_subjectId_schoolYear_name: {
        gradeId: grade.id,
        subjectId: subject.id,
        schoolYear: parsed.data.schoolYear,
        name: parsed.data.name,
      },
    },
    create: {
      gradeId: grade.id,
      subjectId: subject.id,
      schoolYear: parsed.data.schoolYear,
      name: parsed.data.name,
    },
    update: {},
  });

  await prisma.progressPlanItem.deleteMany({ where: { planId: plan.id } });

  const created = [];
  for (const row of accepted) {
    const topic = topicByCode.get(row.topicCode);
    if (!topic) continue;
    const item = await prisma.progressPlanItem.create({
      data: {
        planId: plan.id,
        topicId: topic.id,
        weekNo: row.weekNo,
        suggestedMinutes: row.suggestedMinutes ?? 15,
        note: row.note,
      },
    });
    created.push(item);
  }

  return NextResponse.json({
    planId: plan.id,
    imported: created.length,
    warnings,
  });
}
