export type HubGame = {
  id: string;
  title: string;
  grade: string;
  topic: string;
  url: string;
  author: string;
  source: "seed" | "shared" | string;
  tags?: string[];
};

export type HubCatalog = {
  generatorUrl: string;
  legacyPlatformUrl: string;
  games: HubGame[];
};

export const STORAGE_KEY = "game_platform_shared_v1";

export const GRADES = [
  { key: "p1", label: "小一", full: "小學一年級", blurb: "20／100 以內數感、基本加減、長度與圖形" },
  { key: "p2", label: "小二", full: "小學二年級", blurb: "三／四位數、基本乘除、時間與貨幣" },
  { key: "p3", label: "小三", full: "小學三年級", blurb: "乘法除法、平行垂直、簡易分數與統計" },
  { key: "p4", label: "小四", full: "小學四年級", blurb: "分數比較與加減、小數認識、周界面積" },
  { key: "p5", label: "小五", full: "小學五年級", blurb: "異分母分數、小數乘法、簡易方程與百分數" },
  { key: "p6", label: "小六", full: "小學六年級", blurb: "分數除法、小數除法、圓周、速率與百分數應用" },
] as const;

export const TOPICS: Record<string, string[]> = {
  p1: ["20 以內的數", "基本加減法", "100 以內的數", "長度與距離", "貨幣與時間", "平面與立體圖形"],
  p2: ["三位數加減", "基本乘法", "基本除法", "四位數", "時間與貨幣", "角與四邊形"],
  p3: ["基本乘法", "基本除法", "四則運算", "簡易分數", "平行與垂直", "棒形圖"],
  p4: ["如何比較分數", "不同分數類型", "同分母分數加減法", "小數的認識與比較", "周界與面積計算", "綜合複習"],
  p5: ["異分母分數加減法", "小數乘法運算", "簡易方程與代數", "多邊形面積與立體體積", "百分數的初步認識", "綜合複習"],
  p6: ["分數除法與四則混合運算", "小數除法與循環小數", "百分數的進階應用", "圓周與圓面積計算", "速率與行程問題", "綜合複習"],
};

export const DEFAULT_GENERATOR_URL =
  "https://shamsham2026.github.io/game-generator/";
export const DEFAULT_LEGACY_URL =
  "https://shamsham2026.github.io/6B-game-platform/";

export function gradeMeta(key: string) {
  return GRADES.find((g) => g.key === key) ?? GRADES[0];
}

export function generatorHref(base: string, gradeKey: string) {
  const url = new URL(base || DEFAULT_GENERATOR_URL);
  if (["p4", "p5", "p6"].includes(gradeKey)) {
    url.searchParams.set("grade", gradeKey);
  }
  return url.toString();
}

export function hashId(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

export function encodeSharedPack(list: HubGame[]): string {
  const json = JSON.stringify(
    list.map((g) => ({
      id: g.id,
      title: g.title,
      grade: g.grade,
      topic: g.topic,
      url: g.url,
      author: g.author,
      source: "shared",
      tags: g.tags || [],
    })),
  );
  const b64 = btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  return b64;
}

export function decodeSharedPack(pack: string): HubGame[] {
  try {
    const json = decodeURIComponent(
      escape(atob(pack.replace(/-/g, "+").replace(/_/g, "/"))),
    );
    const list = JSON.parse(json);
    return Array.isArray(list) ? list : [];
  } catch {
    try {
      const list = JSON.parse(decodeURIComponent(pack));
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }
}

export function mergeSharedLists(
  existing: HubGame[],
  incoming: HubGame[],
): HubGame[] {
  const map = new Map(existing.map((g) => [g.id, g]));
  for (const g of incoming) {
    if (!g || !g.url || !g.title || !g.grade) continue;
    const id = g.id || `shared-${hashId(g.url + g.title)}`;
    map.set(id, {
      id,
      title: String(g.title).slice(0, 80),
      grade: String(g.grade),
      topic: String(g.topic || "綜合複習"),
      url: String(g.url),
      author: String(g.author || "同學"),
      source: "shared",
      tags: Array.isArray(g.tags) ? g.tags : ["同學分享"],
    });
  }
  return Array.from(map.values());
}

export function mergeCatalog(
  seed: HubGame[],
  shared: HubGame[],
): HubGame[] {
  const map = new Map<string, HubGame>();
  for (const g of seed) map.set(g.id, { ...g, source: g.source || "seed" });
  for (const g of shared) map.set(g.id, g);
  return Array.from(map.values());
}
