import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { useIssueStore } from '@/store/issueStore';
import { useUIStore } from '@/store/uiStore';
import { useIssueSubscription } from '@/hooks/useIssueSubscription';
import { updateIssueStatus } from '@/services/firebase/issueService';
import { enqueueOperation } from '@/services/offline/offlineQueue';
import IssueCard from '@/components/IssueCard';
import { COLORS } from '@/constants';
import { Issue, IssueCategory, IssueStatus } from '@/types';

type FilterTab = 'all' | 'service' | 'hygiene';

const FILTER_TABS: { key: FilterTab; label: string; emoji: string }[] = [
  { key: 'all', label: 'All', emoji: '📋' },
  { key: 'service', label: 'Service', emoji: '👤' },
  { key: 'hygiene', label: 'Hygiene', emoji: '🧹' },
];

export default function SupervisorDashboard() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { issues, isLoading, updateOptimisticIssue } = useIssueStore();
  const { showToast, isOnline } = useUIStore();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  useIssueSubscription();

  const handleAction = useCallback(
    async (issue: Issue, newStatus: IssueStatus) => {
      updateOptimisticIssue(issue.id, { status: newStatus });

      if (!isOnline) {
        await enqueueOperation({
          id: `update-${issue.id}-${Date.now()}`,
          type: 'UPDATE_ISSUE',
          payload: {
            id: issue.id,
            status: newStatus,
            category: issue.category,
            description: issue.description,
            tableNumber: issue.tableNumber,
          },
          createdAt: Date.now(),
        });
        showToast('Update queued (offline)', 'warning');
        return;
      }

      try {
        await updateIssueStatus(issue.id, newStatus);
        showToast(
          newStatus === 'RESOLVED' ? 'Issue resolved!' : 'Issue started',
          'success'
        );
      } catch {
        updateOptimisticIssue(issue.id, { status: issue.status });
        showToast('Failed to update status', 'error');
      }
    },
    [isOnline, showToast, updateOptimisticIssue]
  );

  const filteredIssues = issues.filter((i) => {
    if (activeFilter === 'all') return true;
    return i.category === (activeFilter as IssueCategory);
  });

  const openCount = issues.filter((i) => i.status === 'OPEN').length;
  const inProgressCount = issues.filter((i) => i.status === 'IN_PROGRESS').length;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>👔 Supervisor</Text>
          <Text style={styles.headerSub}>
            {openCount} open · {inProgressCount} in progress
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabs}>
        {FILTER_TABS.map((tab) => {
          const count =
            tab.key === 'all'
              ? issues.length
              : issues.filter((i) => i.category === tab.key).length;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeFilter === tab.key && styles.tabActive]}
              onPress={() => setActiveFilter(tab.key)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeFilter === tab.key && styles.tabTextActive,
                ]}
              >
                {tab.emoji} {tab.label}
              </Text>
              <View
                style={[
                  styles.countBadge,
                  activeFilter === tab.key && styles.countBadgeActive,
                ]}
              >
                <Text
                  style={[
                    styles.countText,
                    activeFilter === tab.key && styles.countTextActive,
                  ]}
                >
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Issues */}
      {isLoading ? (
        <ActivityIndicator color={COLORS.accent} style={styles.loader} size="large" />
      ) : filteredIssues.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>✅</Text>
          <Text style={styles.emptyText}>All clear in this area!</Text>
        </View>
      ) : (
        <FlatList
          data={filteredIssues}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <IssueCard
              issue={item}
              onAction={item.status !== 'RESOLVED' ? handleAction : undefined}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surfaceAlt },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: COLORS.primaryLight,
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff' },
  headerSub: { color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 3 },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  logoutText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.accent,
  },
  tabText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.accent },
  countBadge: {
    backgroundColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  countBadgeActive: { backgroundColor: COLORS.accent },
  countText: { fontSize: 11, fontWeight: '800', color: COLORS.textSecondary },
  countTextActive: { color: '#fff' },
  list: { padding: 12 },
  loader: { marginTop: 60 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { fontSize: 52, marginBottom: 12 },
  emptyText: { color: COLORS.textSecondary, fontSize: 16, textAlign: 'center' },
});
