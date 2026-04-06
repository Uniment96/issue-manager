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
import { Issue, IssueStatus } from '@/types';

const COLUMNS: { key: IssueStatus; label: string; emoji: string }[] = [
  { key: 'OPEN', label: 'Open', emoji: '🔴' },
  { key: 'IN_PROGRESS', label: 'In Progress', emoji: '🟡' },
  { key: 'RESOLVED', label: 'Resolved', emoji: '🟢' },
];

export default function ChefDashboard() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { issues, isLoading, updateOptimisticIssue } = useIssueStore();
  const { showToast, isOnline } = useUIStore();
  const [activeTab, setActiveTab] = useState<IssueStatus>('OPEN');

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
          newStatus === 'IN_PROGRESS' ? 'Cooking started!' : 'Issue resolved!',
          'success'
        );
      } catch {
        updateOptimisticIssue(issue.id, { status: issue.status });
        showToast('Failed to update status', 'error');
      }
    },
    [isOnline, showToast, updateOptimisticIssue]
  );

  const filteredIssues = issues.filter((i) => i.status === activeTab);
  const counts = {
    OPEN: issues.filter((i) => i.status === 'OPEN').length,
    IN_PROGRESS: issues.filter((i) => i.status === 'IN_PROGRESS').length,
    RESOLVED: issues.filter((i) => i.status === 'RESOLVED').length,
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🍳 Kitchen Board</Text>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Kanban Tabs */}
      <View style={styles.tabs}>
        {COLUMNS.map((col) => (
          <TouchableOpacity
            key={col.key}
            style={[
              styles.tab,
              activeTab === col.key && styles.tabActive,
              activeTab === col.key && { borderBottomColor: COLORS[col.key] },
            ]}
            onPress={() => setActiveTab(col.key)}
          >
            <Text style={[styles.tabText, activeTab === col.key && { color: COLORS[col.key] }]}>
              {col.emoji} {col.label}
            </Text>
            <View style={[styles.badge, { backgroundColor: COLORS[col.key] }]}>
              <Text style={styles.badgeText}>{counts[col.key]}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Issue List */}
      {isLoading ? (
        <ActivityIndicator color={COLORS.accent} style={styles.loader} size="large" />
      ) : filteredIssues.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>
            {activeTab === 'RESOLVED' ? '✅' : '🎉'}
          </Text>
          <Text style={styles.emptyText}>
            {activeTab === 'OPEN'
              ? 'No open issues — kitchen is clear!'
              : activeTab === 'IN_PROGRESS'
              ? 'Nothing in progress right now'
              : 'No resolved issues yet'}
          </Text>
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
    backgroundColor: COLORS.primary,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 5,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  liveText: { color: COLORS.success, fontSize: 12, fontWeight: '700' },
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomWidth: 3,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  list: { padding: 12 },
  loader: { marginTop: 60 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { fontSize: 52, marginBottom: 12 },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
});
