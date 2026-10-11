import { describe, expect, it } from "vitest";
import { buildSessionFeedback } from "./session-feedback";

describe("buildSessionFeedback", () => {
  it("returns one summary sentence and consolidation strategies", () => {
    const feedback = buildSessionFeedback(
      [
        { position: 0, difficulty: 1, isCorrect: true },
        { position: 1, difficulty: 1, isCorrect: true },
        { position: 2, difficulty: 2, isCorrect: true },
        { position: 3, difficulty: 2, isCorrect: false },
        { position: 4, difficulty: 3, isCorrect: true },
        { position: 5, difficulty: 3, isCorrect: false },
        { position: 6, difficulty: 4, isCorrect: false },
        { position: 7, difficulty: 4, isCorrect: false },
        { position: 8, difficulty: 5, isCorrect: false },
        { position: 9, difficulty: 5, isCorrect: false },
      ],
      "分數的加減",
    );

    expect(feedback.total).toBe(10);
    expect(feedback.correctCount).toBe(4);
    expect(feedback.summary).toMatch(/分數的加減/);
    expect(feedback.summary).toMatch(/4\/10/);
    expect(feedback.strategies.length).toBeGreaterThanOrEqual(2);
    expect(feedback.strategies.length).toBeLessThanOrEqual(3);
    expect(feedback.weakBand).toBe("advanced");
  });

  it("praises strong progressive runs", () => {
    const feedback = buildSessionFeedback(
      Array.from({ length: 10 }, (_, i) => ({
        position: i,
        difficulty: Math.floor(i / 2) + 1,
        isCorrect: true,
      })),
      "小數的認識",
    );
    expect(feedback.accuracy).toBe(1);
    expect(feedback.summary).toMatch(/基礎穩固|較高難度/);
  });
});
