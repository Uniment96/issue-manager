import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useDishStore } from '@/store/dishStore';
import { buildDishHealth } from '@/utils/dishInsights';
import DishHealthBadge from '@/components/DishHealthBadge';
import FeedbackCard from '@/components/FeedbackCard';
import { COLORS, DISH_CATEGORY_CONFIG, DISH_ISSUE_TAG_CONFIG, MANAGER_ACTION_CONFIG } from '@/constants';

export default function DishDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { dishes, getFeedbackForDish, getActionsForDish } = useDishStore();

  const dish = dishes.find((d) => d.id === id);
  const feedback = getFeedbackForDish(id ?? '');
  const actions = getActionsForDish(id ?? '');

  const health = useMemo(() => {
    if (!dish) return null;
    return buildDishHealth(dish, feedback);
  }, [dish, feedback]);

  if (!dish || !health) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Dish not found</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>← Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const catConfig = DISH_CATEGORY_CONFIG[dish.category];

  // Top 3 issue tags
  const tagCounts: Record<string, number> = {};
  for (const fb of feedback) {
    for (const tag of fb.issueTags) {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
    }
  }
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Rating distribution
  const ratingDist = [5, 4, 3, 2, 1].map((r) => ({
    rating: r,
    count: feedback.filter((fb) => fb.rating === r).length,
  }));
  const maxCount = Math.max(...ratingDist.map((d) => d.count), 1);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{dish.name}</Text>
          <Text style={styles.headerCat}>{catConfig.emoji} {catConfig.label}</Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Health Score */}
        <View style={styles.healthCard}>
          <DishHealthBadge status={health.healthStatus} score={health.healthScore} />
          <View style={styles.healthMeta}>
            <Text style={styles.healthStat}>⭐ {health.avgRating.toFixed(1)} avg</Text>
            <Text style={styles.healthStat}>•</Text>
            <Text style={styles.healthStat}>{health.feedbackCount} reviews</Text>
            <Text style={styles.healthStat}>•</Text>
            <Text style={[
              styles.healthStat,
              { color: health.trend === 'improving' ? COLORS.success : health.trend === 'declining' ? COLORS.error : COLORS.textSecondary }
            ]}>
              {health.trend === 'improving' ? '↑ Improving' : health.trend === 'declining' ? '↓ Declining' : '→ Stable'}
            </Text>
          </View>
          {dish.isUnderMonitoring && (
            <View style={styles.monitorBanner}>
              <Text style={styles.monitorBannerText}>👁️ Under Monitoring</Text>
            </View>
          )}
        </View>

        {/* Rating Distribution */}
        {feedback.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Rating Distribution</Text>
            {ratingDist.map(({ rating, count }) => (
              <View key={rating} style={styles.ratingBar}>
                <Text style={styles.ratingBarLabel}>{'★'.repeat(rating)}</Text>
                <View style={styles.ratingBarTrack}>
                  <View
                    style={[
                      styles.ratingBarFill,
                      {
                        width: `${(count / maxCount) * 100}%`,
                        backgroundColor: rating >= 4 ? COLORS.success : rating === 3 ? COLORS.warning : COLORS.error,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.ratingBarCount}>{count}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Top Issues */}
        {topTags.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Top Issue Tags</Text>
            {topTags.map(([tag, count]) => {
              const cfg = DISH_ISSUE_TAG_CONFIG[tag as keyof typeof DISH_ISSUE_TAG_CONFIG];
              return (
                <View key={tag} style={styles.topTagRow}>
                  <Text style={styles.topTagLabel}>{cfg?.emoji} {cfg?.label ?? tag}</Text>
                  <View style={styles.topTagCountBadge}>
                    <Text style={styles.topTagCount}>{count}×</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Manager Actions */}
        {actions.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Actions Taken ({actions.length})</Text>
            {actions.map((action) => {
              const cfg = MANAGER_ACTION_CONFIG[action.actionType];
              return (
                <View key={action.id} style={[styles.actionItem, { borderLeftColor: cfg.color }]}>
                  <Text style={[styles.actionType, { color: cfg.color }]}>{cfg.emoji} {cfg.label}</Text>
                  <Text style={styles.actionReason}>{action.reason}</Text>
                  <Text style={styles.actionMeta}>
                    {action.status.replace('_', ' ')} · by {action.createdByName}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Recent Feedback */}
        <Text style={styles.sectionLabel}>
          All Feedback ({feedback.length})
        </Text>
        {feedback.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No feedback yet for this dish</Text>
          </View>
        ) : (
          [...feedback]
            .sort((a, b) => b.createdAt - a.createdAt)
            .map((fb) => <FeedbackCard key={fb.id} feedback={fb} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surfaceAlt },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
  },
  backBtn: { padding: 4, width: 60 },
  backText: { color: 'rgba(255,255,255,0.8)', fontWeight: '700', fontSize: 14 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '900', color: '#fff' },
  headerCat: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  scroll: { padding: 14, paddingBottom: 40 },
  healthCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    alignItems: 'flex-start',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  healthMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  healthStat: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  monitorBanner: {
    backgroundColor: COLORS.info + '15',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  monitorBannerText: { color: COLORS.info, fontWeight: '700', fontSize: 12 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: { fontSize: 14, fontWeight: '900', color: COLORS.textPrimary, marginBottom: 12 },
  ratingBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  ratingBarLabel: { width: 60, fontSize: 11, color: '#f39c12', textAlign: 'right' },
  ratingBarTrack: { flex: 1, height: 10, backgroundColor: COLORS.surfaceAlt, borderRadius: 5, overflow: 'hidden' },
  ratingBarFill: { height: '100%', borderRadius: 5, minWidth: 4 },
  ratingBarCount: { width: 22, fontSize: 12, color: COLORS.textSecondary, fontWeight: '700' },
  topTagRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  topTagLabel: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '600' },
  topTagCountBadge: { backgroundColor: COLORS.error + '15', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  topTagCount: { fontSize: 12, color: COLORS.error, fontWeight: '800' },
  actionItem: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    marginBottom: 12,
  },
  actionType: { fontSize: 13, fontWeight: '800', marginBottom: 3 },
  actionReason: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  actionMeta: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4, textTransform: 'capitalize' },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  emptyState: { alignItems: 'center', paddingVertical: 32 },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyText: { color: COLORS.textSecondary, fontSize: 14 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: 18, color: COLORS.textPrimary, marginBottom: 12 },
  backLink: { color: COLORS.accent, fontWeight: '700', fontSize: 15 },
});
