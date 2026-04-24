import { Issue, DishFeedback } from '../types';
import { COLORS } from '../constants';

export interface PillarScores {
  food: number;
  service: number;
  operations: number;
  hygiene: number;
}

export interface WeeklyTrend {
  date: string;
  overall: number;
  pillars: PillarScores;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const DELAY_MS = 10 * 60 * 1000;       // 10 min = delayed service issue
const STUCK_MS = 30 * 60 * 1000;       // 30 min = stuck operation issue

export function getScoreColor(score: number): string {
  if (score >= 85) return COLORS.success;
  if (score >= 70) return COLORS.info;
  if (score >= 50) return COLORS.warning;
  return COLORS.error;
}

export function getScoreStatus(score: number): 'Excellent' | 'Good' | 'At Risk' | 'Critical' {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'At Risk';
  return 'Critical';
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

// ─── Food Quality ─────────────────────────────────────────────────────────────

function computeFoodScore(feedback: DishFeedback[], windowStart: number): number {
  const inWindow = feedback.filter((f) => f.createdAt >= windowStart);
  if (inWindow.length === 0) return 75; // no data → neutral

  const avgRating = inWindow.reduce((s, f) => s + f.rating, 0) / inWindow.length;
  const lowCount = inWindow.filter((f) => f.rating <= 3).length;
  const lowPct = (lowCount / inWindow.length) * 100;

  const tagFreq: Record<string, number> = {};
  inWindow.forEach((f) =>
    f.issueTags.forEach((t) => {
      tagFreq[t] = (tagFreq[t] || 0) + 1;
    })
  );
  // Tags appearing ≥2 times in the window = repeated complaint
  const repeatedTags = Object.values(tagFreq).filter((c) => c >= 2).length;

  const base = (avgRating / 5) * 100;
  const penaltyLow = lowPct * 0.3;                     // max −30 if all ratings ≤3
  const penaltyTags = Math.min(repeatedTags * 5, 20);  // max −20 for repeated tags

  return clamp(base - penaltyLow - penaltyTags);
}

// ─── Service Performance ──────────────────────────────────────────────────────

function computeServiceScore(issues: Issue[], windowStart: number, now: number): number {
  const serviceIssues = issues.filter(
    (i) =>
      (i.category === 'service' || i.category === 'billing') &&
      i.createdAt >= windowStart
  );
  if (serviceIssues.length === 0) return 90; // no issues = good, not perfect

  const delayed = serviceIssues.filter(
    (i) => i.status !== 'RESOLVED' && now - i.createdAt > DELAY_MS
  );
  const openIssues = serviceIssues.filter(
    (i) => i.status === 'OPEN' || i.status === 'IN_PROGRESS'
  );
  const resolved = serviceIssues.filter((i) => i.status === 'RESOLVED');

  const avgResMs =
    resolved.length > 0
      ? resolved.reduce((s, i) => s + (i.updatedAt - i.createdAt), 0) / resolved.length
      : 0;
  const avgResHrs = avgResMs / (1000 * 60 * 60);

  const delayPct = (delayed.length / serviceIssues.length) * 100;
  const openRatio = (openIssues.length / serviceIssues.length) * 100;

  return clamp(
    100 - delayPct * 0.4 - openRatio * 0.2 - Math.min(avgResHrs * 5, 20)
  );
}

// ─── Operations Efficiency ────────────────────────────────────────────────────

function computeOperationsScore(issues: Issue[], windowStart: number, now: number): number {
  const allIssues = issues.filter((i) => i.createdAt >= windowStart);
  if (allIssues.length === 0) return 85;

  const stuck = allIssues.filter(
    (i) => i.status !== 'RESOLVED' && now - i.createdAt > STUCK_MS
  );
  const backlog = allIssues.filter(
    (i) => i.status === 'OPEN' || i.status === 'IN_PROGRESS'
  );
  const unresolved = allIssues.filter((i) => i.status !== 'RESOLVED');

  const avgOpenMs =
    unresolved.length > 0
      ? unresolved.reduce((s, i) => s + (now - i.createdAt), 0) / unresolved.length
      : 0;
  const avgOpenHrs = avgOpenMs / (1000 * 60 * 60);

  const stuckPct = (stuck.length / allIssues.length) * 100;
  const backlogPct = (backlog.length / allIssues.length) * 100;

  return clamp(
    100 - stuckPct * 0.5 - backlogPct * 0.25 - Math.min(avgOpenHrs * 3, 15)
  );
}

// ─── Hygiene & Compliance ─────────────────────────────────────────────────────

function computeHygieneScore(issues: Issue[], windowStart: number): number {
  const hygieneIssues = issues.filter(
    (i) => i.category === 'hygiene' && i.createdAt >= windowStart
  );
  if (hygieneIssues.length === 0) return 100;

  // Extra penalty for repeat incidents on the same table within 2 hours
  let repeatPenalty = 0;
  const tableMap: Record<string, number[]> = {};
  hygieneIssues.forEach((i) => {
    if (!tableMap[i.tableNumber]) tableMap[i.tableNumber] = [];
    tableMap[i.tableNumber].push(i.createdAt);
  });
  Object.values(tableMap).forEach((times) => {
    times.sort((a, b) => a - b);
    for (let i = 1; i < times.length; i++) {
      if (times[i] - times[i - 1] < 2 * 60 * 60 * 1000) repeatPenalty += 8;
    }
  });

  const basePenalty = Math.min(hygieneIssues.length * 12, 60);
  return clamp(100 - basePenalty - repeatPenalty);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function computeScorecard(
  issues: Issue[],
  feedback: DishFeedback[],
  windowStart: number,
  now: number
): { pillars: PillarScores; overall: number } {
  const food = computeFoodScore(feedback, windowStart);
  const service = computeServiceScore(issues, windowStart, now);
  const operations = computeOperationsScore(issues, windowStart, now);
  const hygiene = computeHygieneScore(issues, windowStart);

  const overall = clamp(
    0.35 * food + 0.3 * service + 0.2 * operations + 0.15 * hygiene
  );

  return { pillars: { food, service, operations, hygiene }, overall };
}

export function generateInsights(
  issues: Issue[],
  feedback: DishFeedback[],
  windowStart: number,
  now: number
): string[] {
  const candidates: Array<{ priority: number; text: string }> = [];

  const wf = feedback.filter((f) => f.createdAt >= windowStart);
  const wi = issues.filter((i) => i.createdAt >= windowStart);

  // Priority 5 — Hygiene (safety-critical first)
  const hygieneIssues = wi.filter((i) => i.category === 'hygiene');
  if (hygieneIssues.length > 0) {
    candidates.push({
      priority: 5,
      text: `${hygieneIssues.length} hygiene issue${hygieneIssues.length > 1 ? 's' : ''} reported today`,
    });
  }

  // Priority 4 — Service delays
  const serviceIssues = wi.filter(
    (i) => i.category === 'service' || i.category === 'billing'
  );
  const delayed = serviceIssues.filter(
    (i) => i.status !== 'RESOLVED' && now - i.createdAt > DELAY_MS
  );
  if (delayed.length > 0 && serviceIssues.length > 0) {
    const pct = Math.round((delayed.length / serviceIssues.length) * 100);
    candidates.push({ priority: 4, text: `${pct}% of service issues are delayed` });
  }

  // Priority 3 — Low-rated dishes
  const lowRated = wf.filter((f) => f.rating <= 3);
  if (lowRated.length > 0) {
    candidates.push({
      priority: 3,
      text: `${lowRated.length} dish rating${lowRated.length > 1 ? 's' : ''} ≤3 stars today`,
    });
  }

  // Priority 3 — Kitchen backlog
  const foodBacklog = wi.filter(
    (i) => i.category === 'food' && i.status !== 'RESOLVED'
  );
  if (foodBacklog.length >= 3) {
    candidates.push({
      priority: 3,
      text: `Kitchen backlog: ${foodBacklog.length} food issues pending`,
    });
  }

  // Priority 2 — Most-repeated dish issue tag
  const tagFreq: Record<string, number> = {};
  wf.forEach((f) =>
    f.issueTags.forEach((t) => {
      tagFreq[t] = (tagFreq[t] || 0) + 1;
    })
  );
  const topTag = Object.entries(tagFreq).sort((a, b) => b[1] - a[1])[0];
  if (topTag && topTag[1] >= 3) {
    candidates.push({
      priority: 2,
      text: `"${topTag[0].replace(/_/g, ' ')}" flagged ${topTag[1]} times`,
    });
  }

  // Priority 1 — No dish ratings
  if (wf.length === 0 && wi.length > 0) {
    candidates.push({ priority: 1, text: 'No dish ratings received today' });
  }

  // Fallback
  if (candidates.length === 0) {
    candidates.push({ priority: 0, text: 'No critical issues detected today' });
  }

  return candidates
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3)
    .map((c) => c.text);
}

export function computeWeeklyTrend(
  issues: Issue[],
  feedback: DishFeedback[],
  now: number
): WeeklyTrend[] {
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const result: WeeklyTrend[] = [];

  for (let i = 6; i >= 0; i--) {
    const dayEnd = now - i * DAY_MS;
    const dayStart = dayEnd - DAY_MS;
    const label = i === 0 ? 'Today' : DAYS[new Date(dayEnd).getDay()];

    const { pillars, overall } = computeScorecard(issues, feedback, dayStart, dayEnd);
    result.push({ date: label, overall, pillars });
  }

  return result;
}

export function getPillarTrend(
  trends: WeeklyTrend[],
  pillar: keyof PillarScores
): 'up' | 'down' | 'stable' {
  if (trends.length < 2) return 'stable';
  const recent = trends[trends.length - 1].pillars[pillar];
  const prior = trends[trends.length - 2].pillars[pillar];
  if (recent > prior + 3) return 'up';
  if (recent < prior - 3) return 'down';
  return 'stable';
}
