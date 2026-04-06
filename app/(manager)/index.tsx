import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useIssueStore } from '@/store/issueStore';
import { useIssueSubscription } from '@/hooks/useIssueSubscription';
import IssueCard from '@/components/IssueCard';
import { COLORS, DELAY_THRESHOLD_MS } from '@/constants';
import { Issue } from '@/types';

type FilterTab = 'all' | 'active' | 'delayed' | 'resolved';

const FILTER_TABS: { key: FilterTab; label: string; color: string }[] = [
  { key: 'all', label: 'All', color: COLORS.info },
  { key: 'active', label: 'Active', color: COLORS.warning },
  { key: 'delayed', label: 'Delayed', color: COLORS.error },
  { key: 'resolved', label: 'Resolved', color: COLORS.success },
];

export default function ManagerDashboard() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { issues, isLoading } = useIssueStore();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  useIssueSubscription();

  const stats = useMemo(() => {
    const now = Date.now();
    const open = issues.filter((i) => i.status === 'OPEN').length;
    const inProgress = issues.filter((i) => i.status === 'IN_PROGRESS').length;
    const resolved = issues.filter((i) => i.status === 'RESOLVED').length;
    const delayed = issues.filter(
      (i) => i.status !== 'RESOLVED' && now - i.createdAt > DELAY_THRESHOLD_MS
    ).length;
    return { open, inProgress, resolved, delayed, total: issues.length };
  }, [issues]);

  const filteredIssues = useMemo<Issue[]>(() => {
    const now = Date.now();
    switch (activeFilter) {
      case 'active':
        return issues.filter((i) => i.status !== 'RESOLVED');
      case 'delayed':
        return issues.filter(
          (i) => i.status !== 'RESOLVED' && now - i.createdAt > DELAY_THRESHOLD_MS
        );
      case 'resolved':
        return issues.filter((i) => i.status === 'RESOLVED');
      default:
        return issues;
    }
  }, [issues, activeFilter]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>📊 Manager View</Text>
          <Text style={styles.headerSub}>Hi, {user?.displayName?.split(' ')[0]}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.addStaffBtn}
            onPress={() => router.push('/(manager)/add-staff')}
          >
            <Text style={styles.addStaffText}>+ Staff</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statsRow}
      >
        <StatCard label="Total" value={stats.total} color={COLORS.info} />
        <StatCard label="Open" value={stats.open} color={COLORS.OPEN} />
        <StatCard label="In Progress" value={stats.inProgress} color={COLORS.IN_PROGRESS} />
        <StatCard label="Delayed ⚠️" value={stats.delayed} color={COLORS.error} />
        <StatCard label="Resolved" value={stats.resolved} color={COLORS.RESOLVED} />
      </ScrollView>

      {/* Filter Tabs */}
      <View style={styles.tabs}>
        {FILTER_TABS.map((tab) => {
          const count =
            tab.key === 'all'
              ? issues.length
              : tab.key === 'active'
              ? stats.open + stats.inProgress
              : tab.key === 'delayed'
              ? stats.delayed
              : stats.resolved;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                activeFilter === tab.key && { borderBottomColor: tab.color },
              ]}
              onPress={() => setActiveFilter(tab.key)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeFilter === tab.key && { color: tab.color },
                ]}
              >
                {tab.label}
              </Text>
              {count > 0 && (
                <View style={[styles.countDot, { backgroundColor: tab.color }]}>
                  <Text style={styles.countDotText}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Issues */}
      {isLoading ? (
        <ActivityIndicator color={COLORS.accent} style={styles.loader} size="large" />
      ) : filteredIssues.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>
            {activeFilter === 'delayed' ? '🎉' : '✅'}
          </Text>
          <Text style={styles.emptyText}>
            {activeFilter === 'delayed'
              ? 'No delayed issues!'
              : activeFilter === 'resolved'
              ? 'No resolved issues yet'
              : 'No issues found'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredIssues}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <IssueCard issue={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={[statStyles.card, { borderTopColor: color }]}>
      <Text style={[statStyles.value, { color }]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    marginRight: 10,
    minWidth: 80,
    alignItems: 'center',
    borderTopWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  value: { fontSize: 26, fontWeight: '900' },
  label: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '700', marginTop: 2 },
});

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
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff' },
  headerSub: { color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 3 },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  addStaffBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addStaffText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  logoutText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  statsRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
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
    paddingVertical: 11,
    gap: 4,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  countDot: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  countDotText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  list: { padding: 12 },
  loader: { marginTop: 60 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { fontSize: 52, marginBottom: 12 },
  emptyText: { color: COLORS.textSecondary, fontSize: 16, textAlign: 'center' },
});
