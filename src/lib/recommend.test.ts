import { describe, expect, it } from "vitest";
import { recommendTopics, updateMasteryScore } from "./recommend";

describe("recommendTopics", () => {
  it("prioritizes this-week weak and prerequisites", () => {
    const recs = recommendTopics({
      currentWeek: 5,
      planTopics: [
        { topicId: "frac", weekNo: 5, title: "分數的加減" },
        { topicId: "dec", weekNo: 4, title: "小數的認識" },
      ],
      mastery: [
        { topicId: "frac", score: 0.3, lastPracticedAt: null, attemptCount: 4 },
        { topicId: "pre", score: 0.2, lastPracticedAt: null, attemptCount: 2 },
      ],
      edges: [
        { fromTopicId: "pre", toTopicId: "frac", relation: "prerequisite" },
      ],
      topicTitles: {
        frac: "分數的加減",
        pre: "先修：分數意義",
        dec: "小數的認識",
      },
      limit: 5,
    });

    expect(recs[0].topicId).toBe("frac");
    expect(recs.some((r) => r.topicId === "pre" && r.reason === "prerequisite")).toBe(
      true,
    );
  });
});

describe("updateMasteryScore", () => {
  it("moves toward 1 on correct answers", () => {
    const next = updateMasteryScore(0.5, true, 3);
    expect(next).toBeGreaterThan(0.5);
  });
});
