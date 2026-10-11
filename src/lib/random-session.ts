/**
 * Seeded RNG for per-login / per-session random question sets.
 */

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

export type PickExercisesInput = {
  studentId: string;
  topicIds: string[];
  exerciseIds: string[];
  recentExerciseIds: string[];
  count: number;
  salt?: string;
  nowIso?: string;
};

export type PickExercisesResult = {
  rngSeed: string;
  selectedIds: string[];
};

/**
 * Build a random practice set:
 * 1) Prefer exercises not seen in recent sessions
 * 2) If pool too small, fall back to full approved pool
 * 3) Shuffle with deterministic seed so the session is reproducible for audit
 */
export function pickRandomExercises(input: PickExercisesInput): PickExercisesResult {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const salt = input.salt ?? Math.random().toString(36).slice(2);
  const rngSeed = [input.studentId, input.topicIds.join(","), nowIso, salt].join(
    "::",
  );
  const rand = mulberry32(hashSeed([rngSeed]));

  const recent = new Set(input.recentExerciseIds);
  let pool = input.exerciseIds.filter((id) => !recent.has(id));
  if (pool.length < input.count) {
    pool = [...input.exerciseIds];
  }

  const shuffled = shuffleInPlace([...pool], rand);
  const selectedIds = shuffled.slice(0, Math.min(input.count, shuffled.length));

  return { rngSeed, selectedIds };
}

export function shuffleOptionOrder(
  optionIds: string[],
  rngSeed: string,
  position: number,
): string[] {
  const rand = mulberry32(hashSeed([rngSeed, String(position), "options"]));
  return shuffleInPlace([...optionIds], rand);
}
