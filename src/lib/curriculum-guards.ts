/**
 * Curriculum invariants: topic objectives are immutable once locked.
 * Progress plans may only schedule topics — never rewrite objective text.
 */

export class CurriculumLockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CurriculumLockError";
  }
}

export type TopicLockState = {
  id: string;
  title: string;
  objectivesLocked: boolean;
  isActive: boolean;
};

export type ObjectiveDraft = {
  code: string;
  text: string;
};

/** Reject any objective text change when topic is locked. */
export function assertCanUpdateObjectives(
  topic: TopicLockState,
  existing: ObjectiveDraft[],
  incoming: ObjectiveDraft[],
): void {
  if (!topic.objectivesLocked) return;

  const byCode = new Map(existing.map((o) => [o.code, o.text]));
  for (const row of incoming) {
    const prev = byCode.get(row.code);
    if (prev === undefined) {
      throw new CurriculumLockError(
        `課題已鎖定，不可新增目標「${row.code}」。只能按範疇新增練習題。`,
      );
    }
    if (prev !== row.text) {
      throw new CurriculumLockError(
        `課題已鎖定，不可修改目標「${row.code}」之文案（課本課題目標）。`,
      );
    }
  }

  for (const prev of existing) {
    if (!incoming.some((o) => o.code === prev.code)) {
      throw new CurriculumLockError(
        `課題已鎖定，不可刪除目標「${prev.code}」。可標記 retired，但不可刪改文案。`,
      );
    }
  }
}

export function assertCanRenameTopic(
  topic: TopicLockState,
  nextTitle: string,
): void {
  if (topic.objectivesLocked && nextTitle !== topic.title) {
    throw new CurriculumLockError("課題已鎖定，不可修改課題標題。");
  }
}

export type ProgressImportRow = {
  topicCode: string;
  weekNo: number;
  suggestedMinutes?: number;
  note?: string;
  /** If provided, only used for reconciliation — never overwrites locked text. */
  objectiveTextCheck?: { code: string; text: string }[];
};

export type ProgressImportResult = {
  accepted: ProgressImportRow[];
  warnings: string[];
};

/**
 * Progress plan import: schedule only.
 * Objective text mismatches become warnings, never writes.
 */
export function reconcileProgressImport(
  rows: ProgressImportRow[],
  topicObjectives: Map<string, ObjectiveDraft[]>,
): ProgressImportResult {
  const accepted: ProgressImportRow[] = [];
  const warnings: string[] = [];

  for (const row of rows) {
    const objectives = topicObjectives.get(row.topicCode);
    if (!objectives) {
      warnings.push(`略過未知課題代碼：${row.topicCode}`);
      continue;
    }

    if (row.objectiveTextCheck?.length) {
      const byCode = new Map(objectives.map((o) => [o.code, o.text]));
      for (const check of row.objectiveTextCheck) {
        const canonical = byCode.get(check.code);
        if (canonical === undefined) {
          warnings.push(
            `課題 ${row.topicCode} 無目標 ${check.code}；進度表不新增目標。`,
          );
        } else if (canonical !== check.text) {
          warnings.push(
            `課題 ${row.topicCode} 目標 ${check.code} 與課本鎖定文案不符；保留課本原文，不覆蓋。`,
          );
        }
      }
    }

    accepted.push({
      topicCode: row.topicCode,
      weekNo: row.weekNo,
      suggestedMinutes: row.suggestedMinutes ?? 15,
      note: row.note,
    });
  }

  return { accepted, warnings };
}
