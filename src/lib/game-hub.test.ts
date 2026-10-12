import { describe, expect, it } from "vitest";
import {
  STORAGE_KEY,
  bootstrapSharedGames,
  buildClassShareUrl,
  classShareToastMessage,
  createSharedGame,
  decodeSharedPack,
  encodeSharedPack,
  mergeCatalog,
  mergeSharedLists,
  normalizeGameUrl,
  readSharedFromStorage,
  writeSharedToStorage,
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

function memoryStorage(initial: Record<string, string> = {}) {
  const store = { ...initial };
  return {
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key: string, value: string) {
      store[key] = value;
    },
    _dump: () => store,
  };
}

describe("game-hub pack codec", () => {
  it("round-trips shared packs including unicode titles", () => {
    const pack = encodeSharedPack([sample]);
    const decoded = decodeSharedPack(pack);
    expect(decoded).toHaveLength(1);
    expect(decoded[0].title).toBe(sample.title);
    expect(decoded[0].url).toBe(sample.url);
    expect(decoded[0].author).toBe("4A01");
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

describe("share → localStorage flow", () => {
  it("writes shared games and reads them back", () => {
    const storage = memoryStorage();
    const game = createSharedGame({
      title: "小數跳跳樂",
      grade: "p6",
      topic: "小數除法與循環小數",
      url: "example.com/my-game",
      author: "6B12",
      now: 1,
    });
    expect(game.url).toBe("https://example.com/my-game");
    expect(normalizeGameUrl("https://keep.me")).toBe("https://keep.me");

    const next = mergeSharedLists([], [game]);
    writeSharedToStorage(storage, next);
    expect(storage._dump()[STORAGE_KEY]).toBeTruthy();

    const loaded = readSharedFromStorage(storage);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].title).toBe("小數跳跳樂");
    expect(loaded[0].source).toBe("shared");
  });

  it("bootstraps from storage and merges ?pack= into localStorage", () => {
    const existing = createSharedGame({
      title: "舊分享",
      grade: "p3",
      topic: "基本乘法",
      url: "https://example.com/old",
      author: "3A01",
      now: 1,
    });
    const incoming = createSharedGame({
      title: "新分享",
      grade: "p4",
      topic: "如何比較分數",
      url: "https://example.com/new",
      author: "4A02",
      now: 2,
    });
    const storage = memoryStorage({
      [STORAGE_KEY]: JSON.stringify([existing]),
    });
    const pack = encodeSharedPack([incoming]);
    const { shared, gradeFromUrl } = bootstrapSharedGames({
      storage,
      searchParams: `?grade=p4&pack=${pack}`,
    });

    expect(gradeFromUrl).toBe("p4");
    expect(shared.map((g) => g.title).sort()).toEqual(["新分享", "舊分享"]);
    expect(readSharedFromStorage(storage)).toHaveLength(2);
  });
});

describe("class share link", () => {
  it("builds hub URL with grade and pack that round-trips", () => {
    const url = buildClassShareUrl({
      hubBaseUrl: "http://localhost:3000/hub",
      grade: "p5",
      sharedGames: [sample],
    });
    expect(url.startsWith("http://localhost:3000/hub?")).toBe(true);

    const params = new URL(url).searchParams;
    expect(params.get("grade")).toBe("p5");
    const pack = params.get("pack");
    expect(pack).toBeTruthy();
    expect(decodeSharedPack(pack!).map((g) => g.id)).toEqual(["shared-1"]);
  });

  it("omits pack when there are no shared games", () => {
    const url = buildClassShareUrl({
      hubBaseUrl: "http://localhost:3000/hub/",
      grade: "p2",
      sharedGames: [],
    });
    expect(url).toBe("http://localhost:3000/hub?grade=p2");
    expect(classShareToastMessage(0)).toMatch(/尚未有同學分享/);
    expect(classShareToastMessage(2)).toMatch(/同學打開即可看到/);
  });
});
