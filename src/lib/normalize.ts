/**
 * Normalize exercise stems for duplicate detection.
 * Collapses whitespace, lowercases, strips trivial punctuation.
 */
export function normalizeStem(stem: string): string {
  return stem
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[.,;:!?。，、；：！？"'「」『』（）()\[\]{}]/g, "")
    // Drop all whitespace so "1/4+2/4" and "1/4 + 2/4" collide for dedupe
    .replace(/[\u3000\s]+/g, "")
    .trim();
}

/** Stable JSON stringify for hash inputs. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

/** Simple FNV-1a style hash → hex (no crypto dependency needed for content keys). */
export function contentHash(parts: string[]): string {
  const input = parts.join("\u0001");
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function exerciseContentHash(
  stem: string,
  answerPayload: unknown,
): { normalizedStem: string; contentHash: string } {
  const normalizedStem = normalizeStem(stem);
  const hash = contentHash([normalizedStem, stableStringify(answerPayload)]);
  return { normalizedStem, contentHash: hash };
}
