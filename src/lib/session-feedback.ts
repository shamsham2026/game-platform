/**
 * End-of-game: one-sentence performance summary + consolidation strategies.
 */

export type AttemptSlice = {
  position: number;
  difficulty: number; // 1..5
  isCorrect: boolean;
};

export type SessionFeedback = {
  summary: string;
  strategies: string[];
  correctCount: number;
  total: number;
  accuracy: number;
  /** Where mistakes clustered */
  weakBand: "basic" | "mid" | "advanced" | "none";
};

function bandOf(difficulty: number): "basic" | "mid" | "advanced" {
  if (difficulty <= 2) return "basic";
  if (difficulty <= 3) return "mid";
  return "advanced";
}

function bandLabel(band: "basic" | "mid" | "advanced"): string {
  if (band === "basic") return "基礎題";
  if (band === "mid") return "進階題";
  return "挑戰題";
}

/**
 * Build a single summary sentence and matching consolidation strategies
 * from a completed 10-question progressive session.
 */
export function buildSessionFeedback(
  attempts: AttemptSlice[],
  topicTitle?: string,
): SessionFeedback {
  const total = attempts.length;
  const correctCount = attempts.filter((a) => a.isCorrect).length;
  const accuracy = total === 0 ? 0 : correctCount / total;
  const topic = topicTitle?.trim() || "本科課題";

  const wrong = attempts.filter((a) => !a.isCorrect);
  const wrongByBand = { basic: 0, mid: 0, advanced: 0 };
  for (const w of wrong) {
    wrongByBand[bandOf(w.difficulty)] += 1;
  }

  let weakBand: SessionFeedback["weakBand"] = "none";
  if (wrong.length > 0) {
    const entries = Object.entries(wrongByBand) as [
      "basic" | "mid" | "advanced",
      number,
    ][];
    entries.sort((a, b) => b[1] - a[1]);
    if (entries[0][1] > 0) weakBand = entries[0][0];
  }

  // Detect "fell off" pattern: early ok, late wrong
  const firstHalf = attempts.slice(0, Math.ceil(total / 2));
  const secondHalf = attempts.slice(Math.ceil(total / 2));
  const firstAcc =
    firstHalf.length === 0
      ? 0
      : firstHalf.filter((a) => a.isCorrect).length / firstHalf.length;
  const secondAcc =
    secondHalf.length === 0
      ? 0
      : secondHalf.filter((a) => a.isCorrect).length / secondHalf.length;
  const fadedLate = firstAcc >= 0.7 && secondAcc < 0.5 && wrong.length >= 2;

  const summary = composeSummary({
    topic,
    correctCount,
    total,
    accuracy,
    weakBand,
    fadedLate,
  });

  const strategies = composeStrategies({
    accuracy,
    weakBand,
    fadedLate,
    topic,
  });

  return {
    summary,
    strategies,
    correctCount,
    total,
    accuracy: Math.round(accuracy * 1000) / 1000,
    weakBand,
  };
}

function composeSummary(opts: {
  topic: string;
  correctCount: number;
  total: number;
  accuracy: number;
  weakBand: SessionFeedback["weakBand"];
  fadedLate: boolean;
}): string {
  const { topic, correctCount, total, accuracy, weakBand, fadedLate } = opts;
  const score = `${correctCount}/${total}`;

  if (total === 0) {
    return `今次未有完成題目，建議稍後再挑戰「${topic}」。`;
  }

  if (accuracy >= 0.9) {
    return `今次「${topic}」由淺入深答對 ${score}，基礎穩固，已可應付較高難度。`;
  }

  if (fadedLate) {
    return `今次「${topic}」前半表現不錯，後半挑戰題較吃力，整體答對 ${score}。`;
  }

  if (accuracy >= 0.7) {
    if (weakBand !== "none") {
      return `今次「${topic}」答對 ${score}，整體不錯，主要可在${bandLabel(weakBand)}再加把勁。`;
    }
    return `今次「${topic}」答對 ${score}，進度良好，繼續保持由淺入深的練習節奏。`;
  }

  if (accuracy >= 0.4) {
    if (weakBand === "basic") {
      return `今次「${topic}」答對 ${score}，基礎步驟仍需先站穩，再挑戰較深題目。`;
    }
    return `今次「${topic}」答對 ${score}，部分概念仍未穩，適合用短練習反覆鞏固。`;
  }

  if (weakBand === "basic") {
    return `今次「${topic}」答對 ${score}，建議先回到最淺的例題，弄清每一步再繼續。`;
  }

  return `今次「${topic}」答對 ${score}，先放慢節奏複習核心步驟，再重新挑戰同一課題。`;
}

function composeStrategies(opts: {
  accuracy: number;
  weakBand: SessionFeedback["weakBand"];
  fadedLate: boolean;
  topic: string;
}): string[] {
  const { accuracy, weakBand, fadedLate, topic } = opts;
  const strategies: string[] = [];

  if (accuracy >= 0.9) {
    strategies.push(`用限時小挑戰複習「${topic}」，保持答題速度與準確度。`);
    strategies.push("嘗試向同學講解一題，用教人的方式鞏固概念。");
    strategies.push("選一條應用題，把步驟寫成三句說明。");
    return strategies;
  }

  if (fadedLate || weakBand === "advanced") {
    strategies.push("先重做今次後半的錯題，只看題幹自己再算一次。");
    strategies.push("把難題拆成「已知 → 求什麼 → 一步計算」，逐步寫出。");
    strategies.push(`隔一天再練一組「${topic}」挑戰題，檢查是否記得步驟。`);
  } else if (weakBand === "mid") {
    strategies.push("挑選兩條中等難度題，對照正確步驟逐行核對。");
    strategies.push("用不同數字重寫同一題型，確認方法可遷移。");
    strategies.push("錯題旁註明「錯因」一句（計算／概念／看錯題）。");
  } else if (weakBand === "basic" || accuracy < 0.4) {
    strategies.push("回到最淺例題，口述每一步為什麼這樣做。");
    strategies.push("連續答對三條基礎題後，才進入下一難度。");
    strategies.push(`明天先用五分鐘溫習「${topic}」關鍵公式或概念，再練習。`);
  } else {
    strategies.push("重做錯題，並用自己的話寫出正確做法。");
    strategies.push("同一題型再練兩條相近題，鞏固方法。");
    strategies.push(`下次登入優先再練「${topic}」，觀察掌握度有否上升。`);
  }

  // Keep 2–3 strategies
  return strategies.slice(0, 3);
}
