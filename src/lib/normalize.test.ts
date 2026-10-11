import { describe, expect, it } from "vitest";
import { exerciseContentHash, normalizeStem } from "./normalize";

describe("normalizeStem", () => {
  it("collapses punctuation, spaces, and case for dedupe", () => {
    expect(normalizeStem("  1/4 + 2/4 =？ ")).toBe("1/4+2/4=");
    expect(normalizeStem("Hello")).toBe(normalizeStem("HELLO"));
  });
});

describe("exerciseContentHash", () => {
  it("is stable for same stem+answer", () => {
    const a = exerciseContentHash("1/4+2/4=?", { correctId: "a" });
    const b = exerciseContentHash("1/4 + 2/4 = ?", { correctId: "a" });
    expect(a.contentHash).toBe(b.contentHash);
  });

  it("differs when answer differs", () => {
    const a = exerciseContentHash("same stem", { correctId: "a" });
    const b = exerciseContentHash("same stem", { correctId: "b" });
    expect(a.contentHash).not.toBe(b.contentHash);
  });
});
