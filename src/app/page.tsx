"use client";

import { FormEvent, useState } from "react";
import { SiteNav } from "@/components/SiteNav";

type Recommendation = {
  topicId: string;
  title: string;
  reason: string;
  priority: number;
  masteryScore: number;
};

type LoginPayload = {
  student: {
    id: string;
    studentNo: string;
    displayName: string | null;
    classCode: string;
    gradeCode: string;
  };
  currentWeek: number;
  recommendations: Recommendation[];
};

type QuizItem = {
  position: number;
  sessionItemId: string;
  exerciseId: string;
  topicId: string;
  stem: string;
  difficulty: number;
  options: { id: string; text: string }[];
};

type SessionSummary = {
  sessionId: string;
  topicTitle: string;
  summary: string;
  strategies: string[];
  correctCount: number;
  total: number;
  accuracy: number;
  weakBand: string;
};

const REASON_LABEL: Record<string, string> = {
  this_week_weak: "本週進度・尚需加強",
  prerequisite: "先修課題未穩",
  recent_weak: "近期弱項",
  fresh: "尚未練習",
};

const DIFF_LABEL = ["", "基礎", "淺層", "進階", "應用", "挑戰"];

export default function HomePage() {
  const [classCode, setClassCode] = useState("4A");
  const [studentNo, setStudentNo] = useState("01");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [login, setLogin] = useState<LoginPayload | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [items, setItems] = useState<QuizItem[]>([]);
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [summary, setSummary] = useState<SessionSummary | null>(null);

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setDone(false);
    setSessionId(null);
    setItems([]);
    setSummary(null);
    try {
      const res = await fetch("/api/auth/student-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classCode, studentNo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "登入失敗");
      setLogin(data);
    } catch (err) {
      setLogin(null);
      setError(err instanceof Error ? err.message : "登入失敗");
    } finally {
      setLoading(false);
    }
  }

  async function startPractice(topicIds: string[]) {
    setError(null);
    setLoading(true);
    setFeedback(null);
    setPicked(null);
    setIndex(0);
    setDone(false);
    setSummary(null);
    try {
      const res = await fetch("/api/practice/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "無法開始練習");
      setSessionId(data.id);
      setItems(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "無法開始練習");
    } finally {
      setLoading(false);
    }
  }

  async function finishSession(id: string) {
    const res = await fetch(`/api/practice/sessions/${id}/summary`);
    const data = await res.json();
    if (res.ok) {
      setSummary(data);
    }
    setDone(true);
    setFeedback(null);
    void fetch("/api/me/recommendations")
      .then((r) => r.json())
      .then((payload) => {
        if (payload.student) setLogin(payload);
      });
  }

  async function answer(optionId: string) {
    if (!items[index] || feedback) return;
    setPicked(optionId);
    const item = items[index];
    const res = await fetch("/api/practice/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionItemId: item.sessionItemId,
        response: { selectedId: optionId },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "提交失敗");
      return;
    }
    setFeedback(data.isCorrect ? "correct" : "wrong");
    window.setTimeout(() => {
      if (index + 1 >= items.length) {
        if (sessionId) void finishSession(sessionId);
        else {
          setDone(true);
          setFeedback(null);
        }
      } else {
        setIndex((i) => i + 1);
        setFeedback(null);
        setPicked(null);
      }
    }, 700);
  }

  const current = items[index];

  return (
    <main className="shell">
      <SiteNav active="practice" />
      {!login ? (
        <section className="hero">
          <div className="hero-grid">
            <div>
              <p className="meta" style={{ animation: "rise .6s ease both" }}>
                公開練習平台
              </p>
              <h1 className="brand">
                課練<span>遊</span>
              </h1>
              <p className="lede">
                每次練習 10 題由淺入深；結束後用一句話總結表現，並給你相應鞏固策略。也可到六級遊戲庫玩同學分享的關卡。
              </p>
              <div className="atmosphere" style={{ marginTop: "1.75rem" }} />
            </div>
            <form className="panel" onSubmit={onLogin}>
              <h2>學生進入</h2>
              <div className="field">
                <label htmlFor="classCode">班別</label>
                <input
                  id="classCode"
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value)}
                  placeholder="例如 4A"
                  autoComplete="off"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="studentNo">學號</label>
                <input
                  id="studentNo"
                  value={studentNo}
                  onChange={(e) => setStudentNo(e.target.value)}
                  placeholder="例如 01"
                  autoComplete="off"
                  required
                />
              </div>
              {error ? <p className="error">{error}</p> : null}
              <button className="btn" type="submit" disabled={loading}>
                {loading ? "進入中…" : "開始今日練習"}
              </button>
            </form>
          </div>
        </section>
      ) : (
        <section style={{ paddingTop: "1.5rem" }}>
          <p className="meta">
            {login.student.gradeCode} · {login.student.classCode} · 學號{" "}
            {login.student.studentNo}
            {login.student.displayName ? ` · ${login.student.displayName}` : ""}
            {" · "}第 {login.currentWeek} 週
          </p>
          <h1 className="brand" style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}>
            今日建議
          </h1>
          <p className="lede">
            每局 10 題由淺入深；課題目標來自課本不可改，系統按範疇抽練習。
          </p>

          {!sessionId || done ? (
            <div className="panel" style={{ marginTop: "1.5rem" }}>
              {summary ? (
                <div className="debrief" style={{ marginBottom: "1.5rem" }}>
                  <h2>本局總結</h2>
                  <p className="summary-line">{summary.summary}</p>
                  <p className="meta" style={{ marginTop: "0.35rem" }}>
                    得分 {summary.correctCount}/{summary.total}
                  </p>
                  <h3 className="strategy-title">鞏固策略</h3>
                  <ol className="strategy-list">
                    {summary.strategies.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ol>
                </div>
              ) : null}

              <h2>{summary ? "繼續練習" : "現在先練這些課題"}</h2>
              {login.recommendations.length === 0 ? (
                <p className="meta">暫無建議，請教師先匯入進度表與審核練習。</p>
              ) : (
                <ul className="rec-list">
                  {login.recommendations.map((r) => (
                    <li key={r.topicId}>
                      <div>
                        <strong>{r.title}</strong>
                        <div className="reason">
                          {REASON_LABEL[r.reason] ?? r.reason}
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: "0.75rem",
                          alignItems: "center",
                        }}
                      >
                        <span className="score">
                          {Math.round(r.masteryScore * 100)}%
                        </span>
                        <button
                          type="button"
                          className="btn"
                          disabled={loading}
                          onClick={() => void startPractice([r.topicId])}
                        >
                          練習 10 題
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {error ? <p className="error">{error}</p> : null}
            </div>
          ) : current ? (
            <div className="panel quiz" style={{ marginTop: "1.5rem" }}>
              <p className="meta">
                第 {index + 1} / {items.length} 題 · 由淺入深 ·{" "}
                {DIFF_LABEL[current.difficulty] ?? `難度 ${current.difficulty}`}
              </p>
              <div className="progress-track" aria-hidden>
                <div
                  className="progress-fill"
                  style={{
                    width: `${((index + 1) / Math.max(items.length, 1)) * 100}%`,
                  }}
                />
              </div>
              <h2>{current.stem}</h2>
              <div className="quiz">
                {current.options.map((opt) => {
                  let cls = "option";
                  if (picked === opt.id && feedback === "correct")
                    cls += " correct";
                  if (picked === opt.id && feedback === "wrong") cls += " wrong";
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      className={cls}
                      disabled={Boolean(feedback)}
                      onClick={() => void answer(opt.id)}
                    >
                      {opt.text}
                    </button>
                  );
                })}
              </div>
              {error ? <p className="error">{error}</p> : null}
            </div>
          ) : null}
        </section>
      )}
    </main>
  );
}
