import { Dish, DishFeedback, DishHealthScore, DishHealthStatus, DishInsight, DishIssueTag } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Frequency map of issue tags across feedback items */
function countTags(feedbacks: DishFeedback[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const fb of feedbacks) {
    for (const tag of fb.issueTags) {
      counts[tag] = (counts[tag] ?? 0) + 1;
    }
  }
  return counts;
}

/** Most frequent issue tag, or null if no tags */
export function getTopIssueTag(feedbacks: DishFeedback[]): DishIssueTag | null {
  const counts = countTags(feedbacks);
  const entries = Object.entries(counts);
  if (entries.length === 0) return null;
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0] as DishIssueTag;
}

/** Average rating (0 if no feedback) */
export function getAvgRating(feedbacks: DishFeedback[]): number {
  if (feedbacks.length === 0) return 0;
  const sum = feedbacks.reduce((acc, fb) => acc + fb.rating, 0);
  return Math.round((sum / feedbacks.length) * 10) / 10;
}

/**
 * Trend: compare avg rating of last 7 days vs prior 7 days.
 * Needs at least 2 feedbacks across both windows to produce a trend.
 */
export function computeTrend(feedbacks: DishFeedback[]): 'improving' | 'declining' | 'stable' {
  const now = Date.now();
  const recent = feedbacks.filter((fb) => now - fb.createdAt <= 7 * DAY_MS);
  const prior = feedbacks.filter(
    (fb) => now - fb.createdAt > 7 * DAY_MS && now - fb.createdAt <= 14 * DAY_MS
  );
  if (recent.length === 0 || prior.length === 0) return 'stable';

  const recentAvg = getAvgRating(recent);
  const priorAvg = getAvgRating(prior);
  const diff = recentAvg - priorAvg;

  if (diff >= 0.4) return 'improving';
  if (diff <= -0.4) return 'declining';
  return 'stable';
}

/**
 * Health Score (0–100):
 *   Base  = avg_rating / 5 * 70   (max 70 pts from rating)
 *   Bonus = min(feedbackCount / 10, 1) * 10  (max 10 pts for volume)
 *   Penalty = issue_tag_ratio * 20  (max 20 pts penalty)
 *   Trend modifier: improving +5, declining -5
 */
export function calculateHealthScore(feedbacks: DishFeedback[]): number {
  if (feedbacks.length === 0) return 50; // neutral for new dishes

  const avg = getAvgRating(feedbacks);
  const base = (avg / 5) * 70;

  const volumeBonus = Math.min(feedbacks.length / 10, 1) * 10;

  const withIssues = feedbacks.filter((fb) => fb.issueTags.length > 0).length;
  const issuePenalty = (withIssues / feedbacks.length) * 20;

  const trend = computeTrend(feedbacks);
  const trendMod = trend === 'improving' ? 5 : trend === 'declining' ? -5 : 0;

  const score = Math.round(base + volumeBonus - issuePenalty + trendMod);
  return Math.max(0, Math.min(100, score));
}

export function getHealthStatus(score: number): DishHealthStatus {
  if (score >= 80) return 'top';
  if (score >= 60) return 'good';
  if (score >= 40) return 'at_risk';
  return 'critical';
}

/** Build a full DishHealthScore for one dish from its feedback */
export function buildDishHealth(dish: Dish, feedbacks: DishFeedback[]): DishHealthScore {
  const score = calculateHealthScore(feedbacks);
  return {
    dishId: dish.id,
    dishName: dish.name,
    isActive: dish.isActive,
    isUnderMonitoring: dish.isUnderMonitoring,
    avgRating: getAvgRating(feedbacks),
    feedbackCount: feedbacks.length,
    topIssueTag: getTopIssueTag(feedbacks),
    trend: computeTrend(feedbacks),
    healthScore: score,
    healthStatus: getHealthStatus(score),
    recentIssues: feedbacks
      .filter((fb) => fb.rating <= 2)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10),
  };
}

/** Build all dish health scores, sorted by health score descending */
export function buildAllDishHealth(
  dishes: Dish[],
  allFeedback: DishFeedback[]
): DishHealthScore[] {
  return dishes
    .filter((d) => d.isActive)
    .map((dish) => {
      const dishFeedback = allFeedback.filter((fb) => fb.dishId === dish.id);
      return buildDishHealth(dish, dishFeedback);
    })
    .sort((a, b) => b.healthScore - a.healthScore);
}

/** Detect actionable insights across all dish health scores */
export function detectInsights(healthScores: DishHealthScore[], allFeedback: DishFeedback[]): DishInsight[] {
  const insights: DishInsight[] = [];
  const now = Date.now();

  for (const hs of healthScores) {
    const dishFeedback = allFeedback.filter((fb) => fb.dishId === hs.dishId);

    // No feedback yet
    if (hs.feedbackCount === 0) {
      insights.push({
        type: 'no_feedback',
        dishName: hs.dishName,
        message: `No feedback received for ${hs.dishName} yet.`,
      });
      continue;
    }

    // Critical dish
    if (hs.healthStatus === 'critical') {
      insights.push({
        type: 'critical',
        dishName: hs.dishName,
        message: `${hs.dishName} is critical (score ${hs.healthScore}/100). Immediate action needed.`,
      });
    }

    // Declining trend
    if (hs.trend === 'declining') {
      insights.push({
        type: 'declining',
        dishName: hs.dishName,
        message: `${hs.dishName} ratings have been declining over the last 7 days.`,
      });
    }

    // Improving trend
    if (hs.trend === 'improving') {
      insights.push({
        type: 'improved',
        dishName: hs.dishName,
        message: `${hs.dishName} is improving — ratings trending up this week.`,
      });
    }

    // Repeated issue tag (≥3 times in last 14 days)
    const recentFeedback = dishFeedback.filter((fb) => now - fb.createdAt <= 14 * DAY_MS);
    const tagCounts = countTags(recentFeedback);
    for (const [tag, count] of Object.entries(tagCounts)) {
      if (count >= 3) {
        insights.push({
          type: 'repeated_issue',
          dishName: hs.dishName,
          message: `"${tag.replace(/_/g, ' ')}" reported ${count}x for ${hs.dishName} in the last 14 days.`,
        });
      }
    }
  }

  return insights;
}
