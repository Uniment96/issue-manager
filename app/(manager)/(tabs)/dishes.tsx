import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useDishStore } from '@/store/dishStore';
import {
  subscribeToDishes,
  subscribeToDishFeedback,
  subscribeToDishActions,
  addDish,
  addDishAction,
  updateDishActionStatus,
} from '@/services/firebase/dishService';
import DishHealthBadge from '@/components/DishHealthBadge';
import FeedbackCard from '@/components/FeedbackCard';
import {
  COLORS,
  DISH_CATEGORY_CONFIG,
  HEALTH_STATUS_CONFIG,
  MANAGER_ACTION_CONFIG,
} from '@/constants';
import {
  DishCategory,
  DishHealthScore,
  DishAction,
  ManagerActionType,
  ManagerActionStatus,
} from '@/types';

type TabKey = 'overview' | 'issues' | 'feed' | 'insights' | 'actions';

const TABS: { key: TabKey; label: string; emoji: string }[] = [
  { key: 'overview', label: 'Dishes', emoji: '🍽️' },
  { key: 'issues', label: 'Issues', emoji: '🚨' },
  { key: 'feed', label: 'Live Feed', emoji: '📡' },
  { key: 'insights', label: 'Insights', emoji: '💡' },
  { key: 'actions', label: 'Actions', emoji: '⚡' },
];

const DISH_CATEGORIES = Object.entries(DISH_CATEGORY_CONFIG) as [DishCategory, { label: string; emoji: string }][];
const ACTION_TYPES = Object.entries(MANAGER_ACTION_CONFIG) as [ManagerActionType, { label: string; emoji: string; color: string; description: string }][];
const ACTION_STATUSES: ManagerActionStatus[] = ['pending', 'in_progress', 'resolved'];

export default function DishesTab() {
  const user = useAuthStore((s) => s.user);
  const { showToast } = useUIStore();
  const {
    setDishes,
    setFeedback,
    setActions,
    getDishHealthScores,
    getInsights,
    getLiveFeed,
    getCriticalFeedback,
    actions,
  } = useDishStore();

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [isLoading, setIsLoading] = useState(true);

  const [showAddDish, setShowAddDish] = useState(false);
  const [newDishName, setNewDishName] = useState('');
  const [newDishCat, setNewDishCat] = useState<DishCategory>('main');
  const [addingDish, setAddingDish] = useState(false);

  const [actionTarget, setActionTarget] = useState<DishHealthScore | null>(null);
  const [actionType, setActionType] = useState<ManagerActionType>('flag_recipe');
  const [actionReason, setActionReason] = useState('');
  const [savingAction, setSavingAction] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const unsubDishes = subscribeToDishes((d) => { setDishes(d); setIsLoading(false); });
    const unsubFeedback = subscribeToDishFeedback(setFeedback);
    const unsubActions = subscribeToDishActions(setActions);
    return () => { unsubDishes(); unsubFeedback(); unsubActions(); };
  }, []);

  const healthScores = getDishHealthScores();
  const insights = getInsights();
  const liveFeed = getLiveFeed();
  const criticalFeedback = getCriticalFeedback();

  const summaryStats = useMemo(() => ({
    top: healthScores.filter((h) => h.healthStatus === 'top').length,
    good: healthScores.filter((h) => h.healthStatus === 'good').length,
    atRisk: healthScores.filter((h) => h.healthStatus === 'at_risk').length,
    critical: healthScores.filter((h) => h.healthStatus === 'critical').length,
  }), [healthScores]);

  const handleAddDish = async () => {
    if (!newDishName.trim()) { showToast('Enter dish name', 'warning'); return; }
    setAddingDish(true);
    try {
      await addDish(newDishName.trim(), newDishCat);
      showToast(`${newDishName.trim()} added to menu`, 'success');
      setNewDishName('');
      setShowAddDish(false);
    } catch {
      showToast('Failed to add dish', 'error');
    } finally {
      setAddingDish(false);
    }
  };

  const handleSaveAction = async () => {
    if (!actionTarget || !actionReason.trim()) {
      showToast('Add a reason', 'warning');
      return;
    }
    if (!user) return;
    setSavingAction(true);
    try {
      await addDishAction({
        dishId: actionTarget.dishId,
        dishName: actionTarget.dishName,
        actionType,
        reason: actionReason.trim(),
        createdBy: user.uid,
        createdByName: user.displayName,
      });
      showToast('Action recorded', 'success');
      setActionTarget(null);
      setActionReason('');
    } catch {
      showToast('Failed to save action', 'error');
    } finally {
      setSavingAction(false);
    }
  };

  const handleStatusChange = async (action: DishAction, status: ManagerActionStatus) => {
    try {
      await updateDishActionStatus(action.id, status);
      showToast('Status updated', 'success');
    } catch {
      showToast('Failed to update', 'error');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header — no back button since this is a tab */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🧠 Dish Intelligence</Text>
        <TouchableOpacity style={styles.addDishBtn} onPress={() => setShowAddDish(true)}>
          <Text style={styles.addDishText}>+ Dish</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Stats */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsRow}>
        {(Object.entries(summaryStats) as [string, number][]).map(([key, count]) => {
          const statusKey = key === 'atRisk' ? 'at_risk' : key as any;
          const cfg = HEALTH_STATUS_CONFIG[statusKey as keyof typeof HEALTH_STATUS_CONFIG];
          return (
            <View key={key} style={[styles.statCard, { borderTopColor: cfg.color }]}>
              <Text style={[styles.statValue, { color: cfg.color }]}>{count}</Text>
              <Text style={styles.statLabel}>{cfg.emoji} {cfg.label}</Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Internal Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.emoji} {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      {isLoading ? (
        <ActivityIndicator color={COLORS.accent} style={styles.loader} size="large" />
      ) : (
        <FlatList
          data={[{ key: 'content' }]}
          keyExtractor={(i) => i.key}
          renderItem={() => (
            <View style={styles.content}>
              {activeTab === 'overview' && (
                <>
                  {healthScores.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyIcon}>🍽️</Text>
                      <Text style={styles.emptyText}>No dishes yet. Tap "+ Dish" to add menu items.</Text>
                    </View>
                  ) : (
                    <>
                      {['top', 'good', 'at_risk', 'critical'].map((section) => {
                        const sectionScores = healthScores.filter((h) => h.healthStatus === section);
                        if (sectionScores.length === 0) return null;
                        const cfg = HEALTH_STATUS_CONFIG[section as keyof typeof HEALTH_STATUS_CONFIG];
                        return (
                          <View key={section} style={styles.sectionBlock}>
                            <Text style={[styles.sectionTitle, { color: cfg.color }]}>
                              {cfg.emoji} {cfg.label} ({sectionScores.length})
                            </Text>
                            {sectionScores.map((hs) => (
                              <DishRow
                                key={hs.dishId}
                                hs={hs}
                                onAction={() => setActionTarget(hs)}
                                onDetail={() => router.push(`/(manager)/dish/${hs.dishId}`)}
                              />
                            ))}
                          </View>
                        );
                      })}
                    </>
                  )}
                </>
              )}

              {activeTab === 'issues' && (
                <>
                  <Text style={styles.tabSectionLabel}>
                    Low-Rated Feedback ({criticalFeedback.length})
                  </Text>
                  {criticalFeedback.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyIcon}>🎉</Text>
                      <Text style={styles.emptyText}>No critical feedback. Great job!</Text>
                    </View>
                  ) : (
                    criticalFeedback.map((fb) => (
                      <FeedbackCard key={fb.id} feedback={fb} showDishName />
                    ))
                  )}
                </>
              )}

              {activeTab === 'feed' && (
                <>
                  <Text style={styles.tabSectionLabel}>
                    Live Feedback ({liveFeed.length})
                  </Text>
                  {liveFeed.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyIcon}>📡</Text>
                      <Text style={styles.emptyText}>No feedback yet. Waiters can submit from their dashboard.</Text>
                    </View>
                  ) : (
                    liveFeed.map((fb) => (
                      <FeedbackCard key={fb.id} feedback={fb} showDishName />
                    ))
                  )}
                </>
              )}

              {activeTab === 'insights' && (
                <>
                  <Text style={styles.tabSectionLabel}>
                    Insights ({insights.length})
                  </Text>
                  {insights.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyIcon}>💡</Text>
                      <Text style={styles.emptyText}>Insights will appear as feedback comes in.</Text>
                    </View>
                  ) : (
                    insights.map((insight, i) => (
                      <InsightCard key={i} insight={insight} />
                    ))
                  )}
                </>
              )}

              {activeTab === 'actions' && (
                <>
                  <Text style={styles.tabSectionLabel}>Manager Actions ({actions.length})</Text>
                  {actions.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyIcon}>⚡</Text>
                      <Text style={styles.emptyText}>No actions recorded. Take action on dishes from the Dishes tab.</Text>
                    </View>
                  ) : (
                    actions.map((action) => (
                      <ActionCard
                        key={action.id}
                        action={action}
                        onStatusChange={handleStatusChange}
                      />
                    ))
                  )}
                </>
              )}
            </View>
          )}
          contentContainerStyle={{ flexGrow: 1 }}
        />
      )}

      {/* Add Dish Modal */}
      <Modal visible={showAddDish} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddDish(false)}>
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Dish to Menu</Text>
            <TouchableOpacity onPress={() => setShowAddDish(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <Text style={styles.modalLabel}>Dish Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Spaghetti Carbonara"
              placeholderTextColor={COLORS.textSecondary}
              value={newDishName}
              onChangeText={setNewDishName}
              autoFocus
            />
            <Text style={styles.modalLabel}>Category</Text>
            <View style={styles.catGrid}>
              {DISH_CATEGORIES.map(([cat, cfg]) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catBtn, newDishCat === cat && styles.catBtnSelected]}
                  onPress={() => setNewDishCat(cat)}
                >
                  <Text style={styles.catBtnText}>{cfg.emoji} {cfg.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.modalSubmit, addingDish && styles.modalSubmitDisabled]}
              onPress={handleAddDish}
              disabled={addingDish}
            >
              {addingDish ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalSubmitText}>Add Dish</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Take Action Modal */}
      <Modal visible={!!actionTarget} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setActionTarget(null)}>
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Take Action: {actionTarget?.dishName}</Text>
            <TouchableOpacity onPress={() => setActionTarget(null)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            <Text style={styles.modalLabel}>Action Type</Text>
            {ACTION_TYPES.map(([type, cfg]) => (
              <TouchableOpacity
                key={type}
                style={[styles.actionOption, actionType === type && { borderColor: cfg.color, backgroundColor: cfg.color + '12' }]}
                onPress={() => setActionType(type)}
              >
                <Text style={styles.actionOptionEmoji}>{cfg.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.actionOptionLabel, { color: cfg.color }]}>{cfg.label}</Text>
                  <Text style={styles.actionOptionDesc}>{cfg.description}</Text>
                </View>
                {actionType === type && <Text style={[styles.check, { color: cfg.color }]}>✓</Text>}
              </TouchableOpacity>
            ))}
            <Text style={[styles.modalLabel, { marginTop: 16 }]}>Reason / Notes</Text>
            <TextInput
              style={[styles.modalInput, { minHeight: 80, textAlignVertical: 'top', paddingTop: 12 }]}
              placeholder="Describe what you observed and why you're taking action..."
              placeholderTextColor={COLORS.textSecondary}
              value={actionReason}
              onChangeText={setActionReason}
              multiline
            />
            <TouchableOpacity
              style={[styles.modalSubmit, { backgroundColor: MANAGER_ACTION_CONFIG[actionType].color }, savingAction && styles.modalSubmitDisabled]}
              onPress={handleSaveAction}
              disabled={savingAction}
            >
              {savingAction ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalSubmitText}>
                  {MANAGER_ACTION_CONFIG[actionType].emoji} {MANAGER_ACTION_CONFIG[actionType].label}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DishRow({
  hs,
  onAction,
  onDetail,
}: {
  hs: DishHealthScore;
  onAction: () => void;
  onDetail: () => void;
}) {
  const trendIcon = hs.trend === 'improving' ? '↑' : hs.trend === 'declining' ? '↓' : '→';
  const trendColor = hs.trend === 'improving' ? COLORS.success : hs.trend === 'declining' ? COLORS.error : COLORS.textSecondary;

  return (
    <TouchableOpacity style={styles.dishRow} onPress={onDetail} activeOpacity={0.8}>
      <View style={styles.dishRowLeft}>
        <View style={styles.dishNameRow}>
          <Text style={styles.dishRowName}>{hs.dishName}</Text>
          {hs.isUnderMonitoring && <Text style={styles.monitorBadge}>👁️ Monitoring</Text>}
        </View>
        <View style={styles.dishRowMeta}>
          <Text style={styles.dishRowStat}>⭐ {hs.avgRating.toFixed(1)}</Text>
          <Text style={styles.dishRowStat}>•</Text>
          <Text style={styles.dishRowStat}>{hs.feedbackCount} reviews</Text>
          {hs.topIssueTag && (
            <>
              <Text style={styles.dishRowStat}>•</Text>
              <Text style={styles.dishRowIssue}>⚠️ {hs.topIssueTag.replace(/_/g, ' ')}</Text>
            </>
          )}
          <Text style={[styles.dishRowTrend, { color: trendColor }]}>{trendIcon}</Text>
        </View>
      </View>
      <View style={styles.dishRowRight}>
        <DishHealthBadge status={hs.healthStatus} score={hs.healthScore} compact />
        <TouchableOpacity style={styles.actionBtn} onPress={onAction}>
          <Text style={styles.actionBtnText}>Act</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function InsightCard({ insight }: { insight: any }) {
  const colors: Record<string, string> = {
    repeated_issue: COLORS.error,
    declining: COLORS.warning,
    improved: COLORS.success,
    no_feedback: COLORS.textSecondary,
    critical: COLORS.error,
  };
  const icons: Record<string, string> = {
    repeated_issue: '🔁',
    declining: '📉',
    improved: '📈',
    no_feedback: '❓',
    critical: '🚨',
  };
  const color = colors[insight.type] ?? COLORS.info;

  return (
    <View style={[styles.insightCard, { borderLeftColor: color }]}>
      <Text style={styles.insightIcon}>{icons[insight.type] ?? '💡'}</Text>
      <Text style={styles.insightText}>{insight.message}</Text>
    </View>
  );
}

function ActionCard({
  action,
  onStatusChange,
}: {
  action: DishAction;
  onStatusChange: (a: DishAction, s: ManagerActionStatus) => void;
}) {
  const cfg = MANAGER_ACTION_CONFIG[action.actionType];
  const statusColors: Record<ManagerActionStatus, string> = {
    pending: COLORS.warning,
    in_progress: COLORS.info,
    resolved: COLORS.success,
  };

  return (
    <View style={[styles.actionCard, { borderLeftColor: cfg.color }]}>
      <View style={styles.actionCardTop}>
        <Text style={styles.actionCardDish}>{action.dishName}</Text>
        <View style={[styles.actionStatusBadge, { backgroundColor: statusColors[action.status] + '20' }]}>
          <Text style={[styles.actionStatusText, { color: statusColors[action.status] }]}>
            {action.status.replace('_', ' ')}
          </Text>
        </View>
      </View>
      <Text style={[styles.actionCardType, { color: cfg.color }]}>
        {cfg.emoji} {cfg.label}
      </Text>
      <Text style={styles.actionCardReason}>{action.reason}</Text>
      <Text style={styles.actionCardBy}>by {action.createdByName}</Text>
      {action.status !== 'resolved' && (
        <View style={styles.actionStatusBtns}>
          {action.status === 'pending' && (
            <TouchableOpacity
              style={[styles.statusBtn, { backgroundColor: COLORS.info + '20' }]}
              onPress={() => onStatusChange(action, 'in_progress')}
            >
              <Text style={[styles.statusBtnText, { color: COLORS.info }]}>→ In Progress</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.statusBtn, { backgroundColor: COLORS.success + '20' }]}
            onPress={() => onStatusChange(action, 'resolved')}
          >
            <Text style={[styles.statusBtnText, { color: COLORS.success }]}>✓ Resolve</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surfaceAlt },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  addDishBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addDishText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  statsRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  statCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    minWidth: 90,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopWidth: 3,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  statValue: { fontSize: 24, fontWeight: '900' },
  statLabel: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '700', marginTop: 2, textAlign: 'center' },
  tabs: { paddingHorizontal: 8, paddingVertical: 8, gap: 6 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  tabTextActive: { color: '#fff' },
  content: { padding: 12 },
  loader: { marginTop: 60 },
  sectionBlock: { marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  tabSectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 44, marginBottom: 10 },
  emptyText: { color: COLORS.textSecondary, fontSize: 15, textAlign: 'center', maxWidth: 260 },
  dishRow: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dishRowLeft: { flex: 1 },
  dishNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  dishRowName: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  monitorBadge: { fontSize: 10, color: COLORS.info, fontWeight: '700', backgroundColor: COLORS.info + '15', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  dishRowMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  dishRowStat: { fontSize: 12, color: COLORS.textSecondary },
  dishRowIssue: { fontSize: 12, color: COLORS.warning, fontWeight: '700' },
  dishRowTrend: { fontSize: 14, fontWeight: '900', marginLeft: 4 },
  dishRowRight: { alignItems: 'flex-end', gap: 8 },
  actionBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  insightCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 4,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  insightIcon: { fontSize: 20 },
  insightText: { flex: 1, fontSize: 14, color: COLORS.textPrimary, lineHeight: 20 },
  actionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 4,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  actionCardDish: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  actionStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  actionStatusText: { fontSize: 11, fontWeight: '800', textTransform: 'capitalize' },
  actionCardType: { fontSize: 13, fontWeight: '800', marginBottom: 4 },
  actionCardReason: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  actionCardBy: { fontSize: 11, color: COLORS.textSecondary, marginTop: 6 },
  actionStatusBtns: { flexDirection: 'row', gap: 8, marginTop: 10 },
  statusBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  statusBtnText: { fontSize: 12, fontWeight: '800' },
  modal: { flex: 1, backgroundColor: COLORS.surface },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '900', color: COLORS.textPrimary, flex: 1 },
  modalClose: { fontSize: 18, color: COLORS.textSecondary, padding: 4 },
  modalBody: { padding: 16 },
  modalLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  modalInput: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  catBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  catBtnSelected: { backgroundColor: COLORS.primary + '15', borderColor: COLORS.primary },
  catBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  modalSubmit: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  modalSubmitDisabled: { opacity: 0.6 },
  modalSubmitText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  actionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginBottom: 10,
    backgroundColor: COLORS.surfaceAlt,
  },
  actionOptionEmoji: { fontSize: 22 },
  actionOptionLabel: { fontSize: 14, fontWeight: '800' },
  actionOptionDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  check: { fontSize: 18, fontWeight: '900' },
});
