import { describe, expect, it } from "vitest";
import { pickRandomExercises, shuffleInPlace, mulberry32 } from "./random-session";

describe("pickRandomExercises", () => {
  it("uses seed and avoids recent ids when possible", () => {
    const ids = ["e1", "e2", "e3", "e4", "e5", "e6"];
    const a = pickRandomExercises({
      studentId: "s1",
      topicIds: ["t1"],
      exerciseIds: ids,
      recentExerciseIds: ["e1", "e2"],
      count: 3,
      salt: "fixed",
      nowIso: "2026-10-11T00:00:00.000Z",
    });
    const b = pickRandomExercises({
      studentId: "s1",
      topicIds: ["t1"],
      exerciseIds: ids,
      recentExerciseIds: ["e1", "e2"],
      count: 3,
      salt: "fixed",
      nowIso: "2026-10-11T00:00:00.000Z",
    });
    expect(a.rngSeed).toBe(b.rngSeed);
    expect(a.selectedIds).toEqual(b.selectedIds);
    expect(a.selectedIds).toHaveLength(3);
    expect(a.selectedIds.some((id) => id === "e1" || id === "e2")).toBe(false);
  });

  it("shuffles deterministically", () => {
    const rand = mulberry32(42);
    const arr = shuffleInPlace([1, 2, 3, 4, 5], rand);
    const rand2 = mulberry32(42);
    const arr2 = shuffleInPlace([1, 2, 3, 4, 5], rand2);
    expect(arr).toEqual(arr2);
  });
});
