import { ReviewStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { exerciseContentHash } from "@/lib/normalize";

export class DuplicateExerciseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DuplicateExerciseError";
  }
}

export type CreateExerciseInput = {
  topicId: string;
  domainId: string;
  stem: string;
  options: unknown[];
  answer: unknown;
  matchPairs?: unknown;
  difficulty?: number;
  templateId?: string;
};

/**
 * Add practice by domain/topic. Never mutates locked objectives.
 * Rejects duplicates within the same topic via contentHash.
 */
export async function createExercise(input: CreateExerciseInput) {
  const topic = await prisma.topic.findUnique({
    where: { id: input.topicId },
    include: { domain: true },
  });
  if (!topic || !topic.isActive) {
    throw new Error("課題不存在或已停用");
  }
  if (topic.domainId !== input.domainId) {
    throw new Error("範疇與課題不相符");
  }

  const { normalizedStem, contentHash } = exerciseContentHash(
    input.stem,
    input.answer,
  );

  const existing = await prisma.exercise.findUnique({
    where: {
      topicId_contentHash: { topicId: input.topicId, contentHash },
    },
  });
  if (existing) {
    throw new DuplicateExerciseError(
      "同一課題下已有相同內容的練習，已拒絕重複寫入。",
    );
  }

  // Soft near-duplicate: identical normalized stem
  const sameStem = await prisma.exercise.findFirst({
    where: { topicId: input.topicId, normalizedStem, isActive: true },
  });
  if (sameStem) {
    throw new DuplicateExerciseError(
      "同一課題下已有題幹相同的練習（正規化後重複）。",
    );
  }

  return prisma.exercise.create({
    data: {
      topicId: input.topicId,
      domainId: input.domainId,
      templateId: input.templateId,
      stem: input.stem,
      normalizedStem,
      contentHash,
      optionsJson: JSON.stringify(input.options),
      answerJson: JSON.stringify(input.answer),
      matchPairsJson: input.matchPairs
        ? JSON.stringify(input.matchPairs)
        : null,
      difficulty: input.difficulty ?? 1,
      reviewStatus: ReviewStatus.pending_review,
    },
  });
}
