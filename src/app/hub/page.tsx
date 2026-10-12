"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import {
  DEFAULT_GENERATOR_URL,
  DEFAULT_LEGACY_URL,
  GRADES,
  TOPICS,
  bootstrapSharedGames,
  buildClassShareUrl,
  classShareToastMessage,
  createSharedGame,
  generatorHref,
  gradeMeta,
  mergeCatalog,
  mergeSharedLists,
  writeSharedToStorage,
  type HubCatalog,
  type HubGame,
} from "@/lib/game-hub";

export default function HubPage() {
  const [seedGames, setSeedGames] = useState<HubGame[]>([]);
  const [sharedGames, setSharedGames] = useState<HubGame[]>([]);
  const [generatorUrl, setGeneratorUrl] = useState(DEFAULT_GENERATOR_URL);
  const [legacyUrl, setLegacyUrl] = useState(DEFAULT_LEGACY_URL);
  const [currentGrade, setCurrentGrade] = useState("p4");
  const [activeTopic, setActiveTopic] = useState("全部");
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const [author, setAuthor] = useState("");
  const [pubGrade, setPubGrade] = useState("p4");
  const [pubTopic, setPubTopic] = useState(TOPICS.p4[0]);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      let seed: HubGame[] = [];
      let gen = DEFAULT_GENERATOR_URL;
      let legacy = DEFAULT_LEGACY_URL;
      try {
        const res = await fetch("/data/games-catalog.json", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as HubCatalog;
          seed = Array.isArray(data.games) ? data.games : [];
          if (data.generatorUrl) gen = data.generatorUrl;
          if (data.legacyPlatformUrl) legacy = data.legacyPlatformUrl;
        }
      } catch {
        /* use empty seed */
      }

      const { shared, gradeFromUrl } = bootstrapSharedGames({
        storage: window.localStorage,
        searchParams: window.location.search,
      });
      const grade = gradeFromUrl ?? "p4";

      if (!cancelled) {
        setSeedGames(seed);
        setSharedGames(shared);
        setGeneratorUrl(gen);
        setLegacyUrl(legacy);
        setCurrentGrade(grade);
        setPubGrade(grade);
        setPubTopic((TOPICS[grade] || ["綜合複習"])[0]);
        setReady(true);
      }
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(t);
  }, [toast]);

  const all = useMemo(
    () => mergeCatalog(seedGames, sharedGames),
    [seedGames, sharedGames],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((g) => {
      if (g.grade !== currentGrade) return false;
      if (activeTopic !== "全部" && g.topic !== activeTopic) return false;
      if (!q) return true;
      const hay = [g.title, g.topic, g.author, ...(g.tags || [])]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [all, currentGrade, activeTopic, query]);

  const meta = gradeMeta(currentGrade);

  function persistShared(next: HubGame[]) {
    writeSharedToStorage(window.localStorage, next);
    setSharedGames(next);
  }

  function selectGrade(key: string) {
    setCurrentGrade(key);
    setActiveTopic("全部");
    setPubGrade(key);
    setPubTopic((TOPICS[key] || ["綜合複習"])[0]);
  }

  /** Returns true when the text was placed on the clipboard. */
  async function copyText(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* fallback below */
    }
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }

  async function copyClassShareLink() {
    const shareUrl = buildClassShareUrl({
      hubBaseUrl: `${window.location.origin}/hub`,
      grade: currentGrade,
      sharedGames,
    });
    const ok = await copyText(shareUrl);
    setToast(
      ok
        ? classShareToastMessage(sharedGames.length)
        : `請手動複製：${shareUrl}`,
    );
  }

  function onPublish(e: FormEvent) {
    e.preventDefault();
    const game = createSharedGame({
      title,
      grade: pubGrade,
      topic: pubTopic,
      url,
      author,
    });
    if (!game.title || !game.author || !game.url) {
      setToast("請填妥班別學號、遊戲名稱與網址");
      return;
    }
    const next = mergeSharedLists(sharedGames, [game]);
    persistShared(next);
    setModalOpen(false);
    setAuthor("");
    setTitle("");
    setUrl("");
    selectGrade(pubGrade);
    setToast("已加入資源庫！記得複製共享連結給同學。");
  }

  function removeShared(id: string) {
    persistShared(sharedGames.filter((g) => g.id !== id));
    setToast("已從本機資源庫移除");
  }

  return (
    <main className="shell hub-shell">
      <SiteNav active="hub" />

      <header className="hub-hero">
        <div>
          <p className="meta">Classroom Game Hub</p>
          <h1 className="brand" style={{ fontSize: "clamp(2rem, 4.5vw, 3.2rem)" }}>
            六級<span>遊戲庫</span>
          </h1>
          <p className="lede">
            小一至小六既有遊戲目錄；用 Game Generator 做好新關卡後，分享網址到班級資源庫，同學即可同享。
          </p>
        </div>
        <div className="hub-actions">
          <a
            className="btn"
            href={generatorHref(generatorUrl, currentGrade)}
            target="_blank"
            rel="noopener noreferrer"
          >
            用 Generator 製作
          </a>
          <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(true)}>
            分享遊戲
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => void copyClassShareLink()}
          >
            複製共享連結
          </button>
        </div>
      </header>

      <section className="hub-stats">
        <div className="stat">
          <strong>{all.length}</strong>
          <span>全部遊戲</span>
        </div>
        <div className="stat">
          <strong>{sharedGames.length}</strong>
          <span>同學分享</span>
        </div>
        <div className="stat">
          <strong>6</strong>
          <span>年級關卡</span>
        </div>
      </section>

      <section className="hub-toolbar">
        <h2>選擇年級</h2>
        <label className="hub-search">
          <span>搜尋</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="遊戲名稱 / 課題 / 作者"
          />
        </label>
      </section>

      <div className="grade-tabs" role="tablist" aria-label="年級">
        {GRADES.map((g) => {
          const count = all.filter((x) => x.grade === g.key).length;
          return (
            <button
              key={g.key}
              type="button"
              role="tab"
              aria-selected={g.key === currentGrade}
              className={g.key === currentGrade ? "grade-tab on" : "grade-tab"}
              onClick={() => selectGrade(g.key)}
            >
              <span className="grade-label">{g.label}</span>
              <span className="grade-count">{count} 款</span>
            </button>
          );
        })}
      </div>

      <section className="panel hub-library">
        <div className="hub-library-head">
          <div>
            <h2>{meta.full}</h2>
            <p className="meta">{meta.blurb}</p>
          </div>
          <div className="hub-actions compact">
            <a
              className="btn"
              href={generatorHref(generatorUrl, currentGrade)}
              target="_blank"
              rel="noopener noreferrer"
            >
              為此年級製作
            </a>
            {currentGrade === "p6" ? (
              <a
                className="btn btn-ghost"
                href={legacyUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                開啟 6B 舊平台
              </a>
            ) : null}
          </div>
        </div>

        <div className="topic-chips">
          {["全部", ...(TOPICS[currentGrade] || [])].map((t) => (
            <button
              key={t}
              type="button"
              className={t === activeTopic ? "chip on" : "chip"}
              onClick={() => setActiveTopic(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {!ready ? (
          <p className="meta">載入資源庫…</p>
        ) : filtered.length === 0 ? (
          <div className="hub-empty">
            <h3>此年級暫時未有遊戲</h3>
            <p className="meta">
              用 Game Generator 做好後，按「分享遊戲」貼上網址，即可加入班級資源庫。
            </p>
            <button type="button" className="btn" onClick={() => setModalOpen(true)}>
              立即分享第一個遊戲
            </button>
          </div>
        ) : (
          <div className="game-grid">
            {filtered.map((g) => {
              const isShared = g.source === "shared";
              return (
                <article key={g.id} className="game-tile">
                  <div className="game-tile-top">
                    <span className={isShared ? "chip on" : "chip"}>
                      {isShared ? "同學分享" : "資源庫"}
                    </span>
                    <span className="meta">{gradeMeta(g.grade).label}</span>
                  </div>
                  <h3>{g.title}</h3>
                  <p className="meta">課題：{g.topic || "綜合複習"}</p>
                  <p className="meta">分享者：{g.author || "同學"}</p>
                  <div className="topic-chips tight">
                    {(g.tags || []).slice(0, 3).map((t) => (
                      <span key={t} className="chip">
                        {t}
                      </span>
                    ))}
                  </div>
                  <div className="hub-actions compact">
                    <a
                      className="btn"
                      href={g.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      開始遊玩
                    </a>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => void copyText(g.url)}
                    >
                      複製連結
                    </button>
                    {isShared ? (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => removeShared(g.id)}
                      >
                        移除
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="panel hub-flow">
        <h2>與 Game Generator 的流程</h2>
        <ol className="flow-steps">
          <li>在 Generator 選年級、課題與玩法，複製提示詞並生成 HTML 遊戲。</li>
          <li>把遊戲上傳到 GitHub Pages 或學校網站，取得可開啟的網址。</li>
          <li>回到本頁按「分享遊戲」，填班別學號與網址，複製共享連結給同學。</li>
        </ol>
      </section>

      {modalOpen ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div className="panel modal-panel" role="dialog" aria-modal="true">
            <div className="hub-library-head">
              <div>
                <h2>分享遊戲到班級資源庫</h2>
                <p className="meta">貼上 Generator 做好的遊戲網址，同學即可一起練習。</p>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                aria-label="關閉"
                onClick={() => setModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <form className="publish-form" onSubmit={onPublish}>
              <div className="field">
                <label htmlFor="f-author">班別學號 / 暱稱</label>
                <input
                  id="f-author"
                  required
                  maxLength={40}
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="例如 6B12 小明"
                />
              </div>
              <div className="publish-row">
                <div className="field">
                  <label htmlFor="f-grade">年級</label>
                  <select
                    id="f-grade"
                    value={pubGrade}
                    onChange={(e) => {
                      const g = e.target.value;
                      setPubGrade(g);
                      setPubTopic((TOPICS[g] || ["綜合複習"])[0]);
                    }}
                  >
                    {GRADES.map((g) => (
                      <option key={g.key} value={g.key}>
                        {g.full}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="f-topic">課題</label>
                  <select
                    id="f-topic"
                    value={pubTopic}
                    onChange={(e) => setPubTopic(e.target.value)}
                  >
                    {(TOPICS[pubGrade] || ["綜合複習"]).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="field">
                <label htmlFor="f-title">遊戲名稱</label>
                <input
                  id="f-title"
                  required
                  maxLength={80}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例如 分數接球挑戰"
                />
              </div>
              <div className="field">
                <label htmlFor="f-url">遊戲網址</label>
                <input
                  id="f-url"
                  required
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="hub-actions compact" style={{ justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setModalOpen(false)}
                >
                  取消
                </button>
                <button type="submit" className="btn">
                  加入資源庫
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {toast ? <div className="toast">{toast}</div> : null}
    </main>
  );
}
