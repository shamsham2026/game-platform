import { describe, expect, it } from "vitest";
import {
  decodeSharedPack,
  encodeSharedPack,
  mergeCatalog,
  mergeSharedLists,
  type HubGame,
} from "./game-hub";

const sample: HubGame = {
  id: "shared-1",
  title: "分數接球",
  grade: "p4",
  topic: "同分母分數加減法",
  url: "https://example.com/game",
  author: "4A01",
  source: "shared",
  tags: ["同學分享"],
};

describe("game-hub pack codec", () => {
  it("round-trips shared packs", () => {
    const pack = encodeSharedPack([sample]);
    const decoded = decodeSharedPack(pack);
    expect(decoded).toHaveLength(1);
    expect(decoded[0].title).toBe(sample.title);
    expect(decoded[0].url).toBe(sample.url);
  });
});

describe("merge helpers", () => {
  it("lets shared games override seed ids and merge catalogs", () => {
    const seed: HubGame[] = [
      { ...sample, id: "seed-1", source: "seed", author: "官方" },
    ];
    const shared = mergeSharedLists([], [sample]);
    const all = mergeCatalog(seed, shared);
    expect(all).toHaveLength(2);
    expect(all.find((g) => g.id === "shared-1")?.source).toBe("shared");
  });
});
