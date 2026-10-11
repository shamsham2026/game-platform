import { describe, expect, it } from "vitest";
import {
  pickProgressiveExercises,
  difficultySlotPlan,
  shuffleInPlace,
  mulberry32,
  PRACTICE_QUESTION_COUNT,
} from "./random-session";

describe("pickProgressiveExercises", () => {
  it("picks 10 questions ordered easy to hard", () => {
    const exercises = Array.from({ length: 20 }, (_, i) => ({
      id: `e${i}`,
      difficulty: (i % 5) + 1,
    }));

    const a = pickProgressiveExercises({
      studentId: "s1",
      topicIds: ["t1"],
      exercises,
      recentExerciseIds: ["e0", "e1"],
      count: PRACTICE_QUESTION_COUNT,
      salt: "fixed",
      nowIso: "2026-10-11T00:00:00.000Z",
    });
    const b = pickProgressiveExercises({
      studentId: "s1",
      topicIds: ["t1"],
      exercises,
      recentExerciseIds: ["e0", "e1"],
      count: PRACTICE_QUESTION_COUNT,
      salt: "fixed",
      nowIso: "2026-10-11T00:00:00.000Z",
    });

    expect(a.rngSeed).toBe(b.rngSeed);
    expect(a.selectedIds).toEqual(b.selectedIds);
    expect(a.selectedIds).toHaveLength(10);

    const byId = new Map(exercises.map((e) => [e.id, e]));
    const diffs = a.selectedIds.map((id) => byId.get(id)!.difficulty);
    for (let i = 1; i < diffs.length; i++) {
      expect(diffs[i]).toBeGreaterThanOrEqual(diffs[i - 1]);
    }
  });

  it("plans two slots per difficulty for count=10", () => {
    expect(difficultySlotPlan(10)).toEqual([2, 2, 2, 2, 2]);
  });

  it("shuffles deterministically", () => {
    const rand = mulberry32(42);
    const arr = shuffleInPlace([1, 2, 3, 4, 5], rand);
    const rand2 = mulberry32(42);
    const arr2 = shuffleInPlace([1, 2, 3, 4, 5], rand2);
    expect(arr).toEqual(arr2);
  });
});
