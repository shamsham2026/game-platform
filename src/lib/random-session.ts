/**
 * Seeded RNG for per-login / per-session random question sets.
 * Sessions use 10 questions ordered easy → hard.
 */

export const PRACTICE_QUESTION_COUNT = 10;

export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(parts: string[]): number {
  let h = 2166136261;
  const s = parts.join("|");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function shuffleInPlace<T>(arr: T[], rand: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export type ExerciseCandidate = {
  id: string;
  difficulty: number; // 1..5
};

export type PickExercisesInput = {
  studentId: string;
  topicIds: string[];
  exercises: ExerciseCandidate[];
  recentExerciseIds: string[];
  count?: number;
  salt?: string;
  nowIso?: string;
};

export type PickExercisesResult = {
  rngSeed: string;
  selectedIds: string[];
};

/** Target slots per difficulty for a 10-question easy→hard arc. */
export function difficultySlotPlan(count: number): number[] {
  // For 10: [2,2,2,2,2] across difficulties 1..5
  if (count <= 0) return [];
  const slots = [0, 0, 0, 0, 0];
  for (let i = 0; i < count; i++) {
    slots[i % 5] += 1;
  }
  return slots;
}

/**
 * Build a progressive practice set:
 * 1) Prefer exercises not seen in recent sessions
 * 2) Sample within each difficulty band
 * 3) Emit in ascending difficulty (由淺入深); randomize within band
 */
export function pickProgressiveExercises(
  input: PickExercisesInput,
): PickExercisesResult {
  const count = input.count ?? PRACTICE_QUESTION_COUNT;
  const nowIso = input.nowIso ?? new Date().toISOString();
  const salt = input.salt ?? Math.random().toString(36).slice(2);
  const rngSeed = [input.studentId, input.topicIds.join(","), nowIso, salt].join(
    "::",
  );
  const rand = mulberry32(hashSeed([rngSeed]));

  const recent = new Set(input.recentExerciseIds);
  let pool = input.exercises.filter((e) => !recent.has(e.id));
  if (pool.length < count) {
    pool = [...input.exercises];
  }

  const byDiff = new Map<number, ExerciseCandidate[]>();
  for (let d = 1; d <= 5; d++) byDiff.set(d, []);
  for (const ex of pool) {
    const d = Math.min(5, Math.max(1, Math.round(ex.difficulty) || 1));
    byDiff.get(d)!.push(ex);
  }
  for (const list of byDiff.values()) {
    shuffleInPlace(list, rand);
  }

  const plan = difficultySlotPlan(count);
  const selected: ExerciseCandidate[] = [];
  const used = new Set<string>();

  // First pass: fill planned slots per difficulty
  for (let i = 0; i < 5; i++) {
    const d = i + 1;
    const need = plan[i] ?? 0;
    const list = byDiff.get(d) ?? [];
    let taken = 0;
    for (const ex of list) {
      if (taken >= need) break;
      if (used.has(ex.id)) continue;
      selected.push(ex);
      used.add(ex.id);
      taken += 1;
    }
  }

  // Backfill from nearest difficulties if a band is short
  if (selected.length < count) {
    const leftovers = shuffleInPlace(
      pool.filter((e) => !used.has(e.id)),
      rand,
    );
    for (const ex of leftovers) {
      if (selected.length >= count) break;
      selected.push(ex);
      used.add(ex.id);
    }
  }

  selected.sort((a, b) => {
    if (a.difficulty !== b.difficulty) return a.difficulty - b.difficulty;
    return a.id.localeCompare(b.id);
  });

  // Stable within-band order already shuffled; re-group after sort keeps band order
  const ordered: ExerciseCandidate[] = [];
  for (let d = 1; d <= 5; d++) {
    const band = selected.filter((e) => Math.round(e.difficulty) === d);
    ordered.push(...band);
  }
  // Include any out-of-range at end
  for (const ex of selected) {
    if (!ordered.includes(ex)) ordered.push(ex);
  }

  return {
    rngSeed,
    selectedIds: ordered.slice(0, count).map((e) => e.id),
  };
}

/** @deprecated alias — prefer pickProgressiveExercises */
export function pickRandomExercises(
  input: PickExercisesInput & { exerciseIds?: string[] },
): PickExercisesResult {
  const exercises =
    input.exercises ??
    (input.exerciseIds ?? []).map((id) => ({ id, difficulty: 1 }));
  return pickProgressiveExercises({ ...input, exercises, count: input.count });
}

export function shuffleOptionOrder(
  optionIds: string[],
  rngSeed: string,
  position: number,
): string[] {
  const rand = mulberry32(hashSeed([rngSeed, String(position), "options"]));
  return shuffleInPlace([...optionIds], rand);
}
