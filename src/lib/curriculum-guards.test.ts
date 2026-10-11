import { describe, expect, it } from "vitest";
import {
  assertCanUpdateObjectives,
  CurriculumLockError,
  reconcileProgressImport,
} from "./curriculum-guards";

describe("assertCanUpdateObjectives", () => {
  const topic = {
    id: "t1",
    title: "分數的加減",
    objectivesLocked: true,
    isActive: true,
  };
  const existing = [{ code: "O1", text: "能計算同分母分數的加法與減法" }];

  it("blocks text edits when locked", () => {
    expect(() =>
      assertCanUpdateObjectives(topic, existing, [
        { code: "O1", text: "被改過的目標" },
      ]),
    ).toThrow(CurriculumLockError);
  });

  it("allows identical payloads when locked", () => {
    expect(() =>
      assertCanUpdateObjectives(topic, existing, existing),
    ).not.toThrow();
  });
});

describe("reconcileProgressImport", () => {
  it("accepts schedule rows and warns on objective mismatch without overwrite", () => {
    const map = new Map([
      ["M4-F1", [{ code: "O1", text: "課本原文" }]],
    ]);
    const result = reconcileProgressImport(
      [
        {
          topicCode: "M4-F1",
          weekNo: 3,
          objectiveTextCheck: [{ code: "O1", text: "錯誤文案" }],
        },
        { topicCode: "UNKNOWN", weekNo: 1 },
      ],
      map,
    );
    expect(result.accepted).toHaveLength(1);
    expect(result.accepted[0].topicCode).toBe("M4-F1");
    expect(result.warnings.length).toBeGreaterThanOrEqual(2);
  });
});
