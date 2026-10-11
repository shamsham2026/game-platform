import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createExercise,
  DuplicateExerciseError,
} from "@/lib/exercise-service";

const bodySchema = z.object({
  topicId: z.string(),
  domainId: z.string(),
  stem: z.string().min(1),
  options: z.array(z.unknown()).default([]),
  answer: z.any(),
  matchPairs: z.any().optional(),
  difficulty: z.number().int().min(1).max(5).optional(),
  templateId: z.string().optional(),
});

/** Teacher/content: add practice by domain. Does not alter topic objectives. */
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "欄位不完整" }, { status: 400 });
  }

  try {
    const exercise = await createExercise({
      topicId: parsed.data.topicId,
      domainId: parsed.data.domainId,
      stem: parsed.data.stem,
      options: parsed.data.options,
      answer: parsed.data.answer ?? null,
      matchPairs: parsed.data.matchPairs,
      difficulty: parsed.data.difficulty,
      templateId: parsed.data.templateId,
    });
    return NextResponse.json(exercise, { status: 201 });
  } catch (e) {
    if (e instanceof DuplicateExerciseError) {
      return NextResponse.json({ error: e.message }, { status: 409 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "建立失敗" },
      { status: 400 },
    );
  }
}
