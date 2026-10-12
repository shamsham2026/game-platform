/**
 * Login recommendations: which topics to practice first.
 *
 * Priority:
 * 1. This week's progress-plan topics with low mastery
 * 2. Recently weak topics (low score, recent practice)
 * 3. Prerequisite topics linked via ConnectionEdge
 */

export type MasteryRow = {
  topicId: string;
  score: number; // 0..1
  lastPracticedAt: string | null;
  attemptCount: number;
};

export type PlanWeekTopic = {
  topicId: string;
  weekNo: number;
  title: string;
};

export type Edge = {
  fromTopicId: string; // prerequisite
  toTopicId: string;
  relation: string;
};

export type RecommendInput = {
  currentWeek: number;
  planTopics: PlanWeekTopic[];
  mastery: MasteryRow[];
  edges: Edge[];
  topicTitles: Record<string, string>;
  limit?: number;
  weakThreshold?: number;
};

export type Recommendation = {
  topicId: string;
  title: string;
  reason: "this_week_weak" | "recent_weak" | "prerequisite" | "fresh";
  priority: number;
  masteryScore: number;
};

export function recommendTopics(input: RecommendInput): Recommendation[] {
  const limit = input.limit ?? 5;
  const weakThreshold = input.weakThreshold ?? 0.7;
  const masteryByTopic = new Map(input.mastery.map((m) => [m.topicId, m]));
  const out: Recommendation[] = [];
  const seen = new Set<string>();

  const push = (rec: Recommendation) => {
    if (seen.has(rec.topicId)) return;
    seen.add(rec.topicId);
    out.push(rec);
  };

  const thisWeek = input.planTopics.filter((p) => p.weekNo === input.currentWeek);
  for (const row of thisWeek) {
    const m = masteryByTopic.get(row.topicId);
    const score = m?.score ?? 0;
    if (score < weakThreshold) {
      push({
        topicId: row.topicId,
        title: row.title,
        reason: "this_week_weak",
        priority: 100 - score * 40,
        masteryScore: score,
      });
    }
  }

  // Prerequisites of this week's topics that are still weak
  for (const row of thisWeek) {
    const prereqs = input.edges.filter(
      (e) => e.toTopicId === row.topicId && e.relation === "prerequisite",
    );
    for (const e of prereqs) {
      const m = masteryByTopic.get(e.fromTopicId);
      const score = m?.score ?? 0;
      if (score < weakThreshold) {
        push({
          topicId: e.fromTopicId,
          title: input.topicTitles[e.fromTopicId] ?? e.fromTopicId,
          reason: "prerequisite",
          priority: 90 - score * 30,
          masteryScore: score,
        });
      }
    }
  }

  const weakRecent = [...input.mastery]
    .filter((m) => m.score < weakThreshold && m.attemptCount > 0)
    .sort((a, b) => a.score - b.score);

  for (const m of weakRecent) {
    push({
      topicId: m.topicId,
      title: input.topicTitles[m.topicId] ?? m.topicId,
      reason: "recent_weak",
      priority: 70 - m.score * 20,
      masteryScore: m.score,
    });
  }

  // Fresh plan topics not yet practiced
  for (const row of thisWeek) {
    const m = masteryByTopic.get(row.topicId);
    if (!m || m.attemptCount === 0) {
      push({
        topicId: row.topicId,
        title: row.title,
        reason: "fresh",
        priority: 60,
        masteryScore: 0,
      });
    }
  }

  return out.sort((a, b) => b.priority - a.priority).slice(0, limit);
}

/** Exponential moving mastery update after an attempt. */
export function updateMasteryScore(
  prevScore: number,
  isCorrect: boolean,
  attemptCount: number,
): number {
  const alpha = Math.min(0.45, 0.2 + 1 / (attemptCount + 2));
  const observation = isCorrect ? 1 : 0;
  const next = prevScore * (1 - alpha) + observation * alpha;
  return Math.round(next * 1000) / 1000;
}
