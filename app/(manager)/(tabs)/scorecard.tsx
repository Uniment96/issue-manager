import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIssueStore } from '@/store/issueStore';
import { useDishStore } from '@/store/dishStore';
import { useIssueSubscription } from '@/hooks/useIssueSubscription';
import { subscribeToDishFeedback } from '@/services/firebase/dishService';
import {
  computeScorecard,
  generateInsights,
  computeWeeklyTrend,
  getPillarTrend,
  getScoreColor,
  getScoreStatus,
  PillarScores,
  WeeklyTrend,
} from '@/utils/scorecardUtils';
import { COLORS } from '@/constants';

type ViewMode = 'daily' | 'weekly';

const DAY_MS = 24 * 60 * 60 * 1000;
const CHART_HEIGHT = 140;

const PILLAR_CONFIG: {
  key: keyof PillarScores;
  label: string;
  weight: string;
  emoji: string;
}[] = [
  { key: 'food', label: 'Food Quality', weight: '35%', emoji: '🍽️' },
  { key: 'service', label: 'Service', weight: '30%', emoji: '👤' },
  { key: 'operations', label: 'Operations', weight: '20%', emoji: '⚙️' },
  { key: 'hygiene', label: 'Hygiene', weight: '15%', emoji: '🧹' },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ScorecardScreen() {
  const issues = useIssueStore((s) => s.issues);
  const issuesLoading = useIssueStore((s) => s.isLoading);
  const { feedback, setFeedback } = useDishStore();
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [feedbackReady, setFeedbackReady] = useState(false);

  useIssueSubscription();

  useEffect(() => {
    const unsub = subscribeToDishFeedback((data) => {
      setFeedback(data);
      setFeedbackReady(true);
    });
    return unsub;
  }, []);

  const { pillars, overall } = useMemo(() => {
    const now = Date.now();
    return computeScorecard(issues, feedback, now - DAY_MS, now);
  }, [issues, feedback]);

  const insights = useMemo(() => {
    const now = Date.now();
    return generateInsights(issues, feedback, now - DAY_MS, now);
  }, [issues, feedback]);

  const weeklyTrend = useMemo(() => {
    return computeWeeklyTrend(issues, feedback, Date.now());
  }, [issues, feedback]);

  const delta =
    weeklyTrend.length >= 2
      ? overall - weeklyTrend[weeklyTrend.length - 2].overall
      : null;

  const scoreColor = getScoreColor(overall);
  const status = getScoreStatus(overall);
  const isLoading = issuesLoading && !feedbackReady;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Performance Scorecard</Text>
          <Text style={styles.headerSub}>
            {new Date().toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
          </Text>
        </View>
        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'daily' && styles.toggleActive]}
            onPress={() => setViewMode('daily')}
          >
            <Text
              style={[
                styles.toggleLabel,
                viewMode === 'daily' && styles.toggleLabelActive,
              ]}
            >
              Daily
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'weekly' && styles.toggleActive]}
            onPress={() => setViewMode('weekly')}
          >
            <Text
              style={[
                styles.toggleLabel,
                viewMode === 'weekly' && styles.toggleLabelActive,
              ]}
            >
              Weekly
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={COLORS.accent} size="large" />
          <Text style={styles.loaderText}>Computing scores…</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {viewMode === 'daily' ? (
            <DailyView
              overall={overall}
              pillars={pillars}
              delta={delta}
              status={status}
              scoreColor={scoreColor}
              insights={insights}
            />
          ) : (
            <WeeklyView weeklyTrend={weeklyTrend} />
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Daily View ───────────────────────────────────────────────────────────────

function DailyView({
  overall,
  pillars,
  delta,
  status,
  scoreColor,
  insights,
}: {
  overall: number;
  pillars: PillarScores;
  delta: number | null;
  status: string;
  scoreColor: string;
  insights: string[];
}) {
  return (
    <>
      <View style={styles.scoreSection}>
        <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
          <Text style={[styles.scoreNumber, { color: scoreColor }]}>{overall}</Text>
          <Text style={styles.scoreOutOf}>/100</Text>
        </View>
        <Text style={[styles.statusLabel, { color: scoreColor }]}>{status}</Text>
        {delta !== null && (
          <Text
            style={[
              styles.delta,
              { color: delta >= 0 ? COLORS.success : COLORS.error },
            ]}
          >
            {delta >= 0 ? '+' : ''}
            {delta} vs yesterday
          </Text>
        )}
      </View>

      <View style={styles.pillarGrid}>
        {PILLAR_CONFIG.map((p) => {
          const score = pillars[p.key];
          const color = getScoreColor(score);
          return (
            <View key={p.key} style={styles.pillarCard}>
              <Text style={styles.pillarEmoji}>{p.emoji}</Text>
              <Text style={styles.pillarName}>{p.label}</Text>
              <Text style={[styles.pillarScore, { color }]}>{score}</Text>
              <Text style={styles.pillarWeight}>{p.weight}</Text>
              <View style={styles.pillarBarBg}>
                <View
                  style={[
                    styles.pillarBarFill,
                    { width: `${score}%`, backgroundColor: color },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.insightsSection}>
        <Text style={styles.sectionTitle}>Key Insights</Text>
        {insights.map((text, i) => (
          <View key={i} style={styles.insightRow}>
            <View style={styles.insightDot} />
            <Text style={styles.insightText}>{text}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.updatedAt}>
        Updated {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </>
  );
}

// ─── Weekly View ──────────────────────────────────────────────────────────────

function WeeklyView({ weeklyTrend }: { weeklyTrend: WeeklyTrend[] }) {
  return (
    <>
      <View style={styles.chartSection}>
        <Text style={styles.sectionTitle}>7-Day Overall Score</Text>
        <View style={styles.chart}>
          {weeklyTrend.map((day, i) => {
            const barH = Math.max((day.overall / 100) * CHART_HEIGHT, 4);
            const color = getScoreColor(day.overall);
            const isToday = day.date === 'Today';
            return (
              <View key={i} style={styles.barGroup}>
                <Text style={[styles.barScore, { color }]}>{day.overall}</Text>
                <View style={[styles.barTrack, { height: CHART_HEIGHT }]}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: barH,
                        backgroundColor: color,
                        opacity: isToday ? 1 : 0.5,
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.barLabel,
                    isToday && { fontWeight: '900', color: COLORS.textPrimary },
                  ]}
                >
                  {day.date === 'Today' ? 'Now' : day.date}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.legend}>
          {[
            { label: 'Excellent', color: COLORS.success },
            { label: 'Good', color: COLORS.info },
            { label: 'At Risk', color: COLORS.warning },
            { label: 'Critical', color: COLORS.error },
          ].map((item) => (
            <View key={item.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={styles.legendLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.trendsSection}>
        <Text style={styles.sectionTitle}>Pillar Trends</Text>
        {PILLAR_CONFIG.map((p) => {
          const trend = getPillarTrend(weeklyTrend, p.key);
          const today = weeklyTrend[weeklyTrend.length - 1]?.pillars[p.key] ?? 0;
          const scoreColor = getScoreColor(today);
          const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
          const trendColor =
            trend === 'up'
              ? COLORS.success
              : trend === 'down'
              ? COLORS.error
              : COLORS.textSecondary;
          const trendLabel =
            trend === 'up' ? 'Improving' : trend === 'down' ? 'Declining' : 'Stable';

          return (
            <View key={p.key} style={styles.trendRow}>
              <Text style={styles.trendEmoji}>{p.emoji}</Text>
              <View style={styles.trendMeta}>
                <Text style={styles.trendName}>{p.label}</Text>
                <Text style={[styles.trendDirection, { color: trendColor }]}>
                  {trendIcon} {trendLabel}
                </Text>
              </View>
              <View style={styles.trendScoreWrap}>
                <Text style={[styles.trendScore, { color: scoreColor }]}>{today}</Text>
                <Text style={styles.trendWeight}>{p.weight}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surfaceAlt },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: COLORS.primary,
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 3 },
  toggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
    padding: 2,
  },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6 },
  toggleActive: { backgroundColor: '#fff' },
  toggleLabel: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  toggleLabelActive: { color: COLORS.primary },

  content: { paddingBottom: 24 },
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loaderText: { color: COLORS.textSecondary, fontSize: 14 },

  // ── Daily ──────────────────────────────────────────────────────────────────

  scoreSection: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  scoreCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  scoreNumber: { fontSize: 52, fontWeight: '900', lineHeight: 58 },
  scoreOutOf: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
  statusLabel: { fontSize: 20, fontWeight: '800', marginTop: 4 },
  delta: { fontSize: 14, fontWeight: '600' },

  pillarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  pillarCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  pillarEmoji: { fontSize: 22, marginBottom: 6 },
  pillarName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  pillarScore: { fontSize: 36, fontWeight: '900', lineHeight: 40 },
  pillarWeight: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 10 },
  pillarBarBg: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  pillarBarFill: { height: 4, borderRadius: 2 },

  insightsSection: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  insightDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.accent,
    marginTop: 5,
    flexShrink: 0,
  },
  insightText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
    flex: 1,
    fontWeight: '500',
  },
  updatedAt: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 20,
    marginBottom: 4,
  },

  // ── Weekly ─────────────────────────────────────────────────────────────────

  chartSection: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  barGroup: { flex: 1, alignItems: 'center', gap: 4 },
  barScore: { fontSize: 10, fontWeight: '700' },
  barTrack: {
    width: '80%',
    justifyContent: 'flex-end',
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: COLORS.surfaceAlt,
  },
  bar: { width: '100%', borderRadius: 4 },
  barLabel: { fontSize: 9, color: COLORS.textSecondary, fontWeight: '600', marginTop: 2 },

  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },

  trendsSection: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  trendEmoji: { fontSize: 20, width: 28, textAlign: 'center' },
  trendMeta: { flex: 1, gap: 2 },
  trendName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  trendDirection: { fontSize: 13, fontWeight: '600' },
  trendScoreWrap: { alignItems: 'flex-end', gap: 1 },
  trendScore: { fontSize: 24, fontWeight: '900' },
  trendWeight: { fontSize: 11, color: COLORS.textSecondary },
});
