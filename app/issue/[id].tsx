import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { formatDistanceToNow, format } from 'date-fns';
import { useAuthStore } from '@/store/authStore';
import { useIssueStore } from '@/store/issueStore';
import { useUIStore } from '@/store/uiStore';
import { updateIssueStatus } from '@/services/firebase/issueService';
import { apiUpdateIssue } from '@/services/api/issueApi';
import { enqueueOperation } from '@/services/offline/offlineQueue';
import StatusBadge from '@/components/StatusBadge';
import { CATEGORY_CONFIG, COLORS, DELAY_THRESHOLD_MS } from '@/constants';
import { IssueStatus } from '@/types';

export default function IssueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { issues, isLoading, updateOptimisticIssue } = useIssueStore();
  const { showToast, isOnline } = useUIStore();

  const issue = issues.find((i) => i.id === id);

  const canAct = user?.role === 'chef' || user?.role === 'supervisor' || user?.role === 'manager';

  const handleStatusUpdate = useCallback(
    async (newStatus: IssueStatus) => {
      if (!issue) return;

      Alert.alert(
        newStatus === 'IN_PROGRESS' ? 'Start Issue?' : 'Resolve Issue?',
        newStatus === 'IN_PROGRESS'
          ? 'Mark this issue as in progress?'
          : 'Mark this issue as resolved?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm',
            style: newStatus === 'RESOLVED' ? 'destructive' : 'default',
            onPress: async () => {
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
                apiUpdateIssue(issue.id, newStatus).catch(() => null); // non-blocking REST mirror
                showToast(
                  newStatus === 'RESOLVED' ? 'Issue resolved!' : 'Issue started',
                  'success'
                );
                if (newStatus === 'RESOLVED') router.back();
              } catch {
                updateOptimisticIssue(issue.id, { status: issue.status });
                showToast('Failed to update status', 'error');
              }
            },
          },
        ]
      );
    },
    [issue, isOnline, showToast, updateOptimisticIssue, router]
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COLORS.accent} size="large" />
      </View>
    );
  }

  if (!issue) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFoundIcon}>🔍</Text>
        <Text style={styles.notFoundText}>Issue not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const config = CATEGORY_CONFIG[issue.category];
  const isDelayed =
    issue.status !== 'RESOLVED' && Date.now() - issue.createdAt > DELAY_THRESHOLD_MS;
  const timeAgo = formatDistanceToNow(new Date(issue.createdAt), { addSuffix: true });
  const createdAt = format(new Date(issue.createdAt), 'MMM d, yyyy · h:mm a');
  const elapsed = Math.floor((Date.now() - issue.createdAt) / 60000);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Category Banner */}
        <View style={[styles.banner, { backgroundColor: config.color }]}>
          <Text style={styles.bannerEmoji}>{config.emoji}</Text>
          <Text style={styles.bannerLabel}>{config.label} Issue</Text>
          {isDelayed && (
            <View style={styles.delayedTag}>
              <Text style={styles.delayedTagText}>⚠️ DELAYED</Text>
            </View>
          )}
        </View>

        <View style={styles.body}>
          {/* Status + Table Row */}
          <View style={styles.row}>
            <StatusBadge status={issue.status} size="md" />
            <View style={styles.tableTag}>
              <Text style={styles.tableTagText}>🪑 Table {issue.tableNumber}</Text>
            </View>
          </View>

          {/* Description */}
          <Text style={styles.fieldLabel}>Description</Text>
          <View style={styles.descBox}>
            <Text style={styles.descText}>{issue.description}</Text>
          </View>

          {/* Time Info */}
          <Text style={styles.fieldLabel}>Time</Text>
          <View style={styles.infoGrid}>
            <InfoRow label="Created" value={createdAt} />
            <InfoRow
              label="Elapsed"
              value={elapsed < 60 ? `${elapsed} min` : `${Math.floor(elapsed / 60)}h ${elapsed % 60}m`}
              valueColor={isDelayed ? COLORS.error : COLORS.textPrimary}
            />
            <InfoRow label="Reported" value={timeAgo} />
            <InfoRow label="Reported by" value={issue.createdByName} />
            {issue.assignedTo && <InfoRow label="Assigned to" value={issue.assignedTo} />}
          </View>

          {/* Offline note */}
          {issue.isOfflineCreated && (
            <View style={styles.offlineBadge}>
              <Text style={styles.offlineBadgeText}>
                ⏳ This issue was created offline and is pending sync
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        {canAct && issue.status !== 'RESOLVED' && (
          <View style={styles.actions}>
            {issue.status === 'OPEN' && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: COLORS.IN_PROGRESS }]}
                onPress={() => handleStatusUpdate('IN_PROGRESS')}
                activeOpacity={0.85}
              >
                <Text style={styles.actionBtnText}>▶  Start</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: COLORS.RESOLVED }]}
              onPress={() => handleStatusUpdate('RESOLVED')}
              activeOpacity={0.85}
            >
              <Text style={styles.actionBtnText}>✓  Resolve</Text>
            </TouchableOpacity>
          </View>
        )}

        {issue.status === 'RESOLVED' && (
          <View style={styles.resolvedBanner}>
            <Text style={styles.resolvedText}>✅ This issue has been resolved</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={infoStyles.row}>
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={[infoStyles.value, valueColor ? { color: valueColor } : null]}>
        {value}
      </Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  label: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  value: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700', flexShrink: 1, textAlign: 'right', marginLeft: 12 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surfaceAlt },
  scroll: { paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: COLORS.surfaceAlt },
  notFoundIcon: { fontSize: 52, marginBottom: 12 },
  notFoundText: { fontSize: 18, color: COLORS.textSecondary, marginBottom: 20 },
  backBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  banner: {
    padding: 24,
    alignItems: 'center',
    paddingBottom: 28,
  },
  bannerEmoji: { fontSize: 52, marginBottom: 8 },
  bannerLabel: { color: '#fff', fontSize: 20, fontWeight: '900' },
  delayedTag: {
    marginTop: 10,
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  delayedTagText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  body: { padding: 16, gap: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  tableTag: {
    backgroundColor: COLORS.info + '18',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.info + '40',
  },
  tableTagText: { color: COLORS.info, fontWeight: '800', fontSize: 14 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 12,
  },
  descBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  descText: { color: COLORS.textPrimary, fontSize: 16, lineHeight: 24 },
  infoGrid: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  offlineBadge: {
    marginTop: 12,
    backgroundColor: COLORS.warning + '18',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.warning + '40',
  },
  offlineBadgeText: { color: COLORS.warning, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  actions: {
    padding: 16,
    gap: 10,
  },
  actionBtn: {
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  actionBtnText: { color: '#fff', fontSize: 17, fontWeight: '900' },
  resolvedBanner: {
    margin: 16,
    backgroundColor: COLORS.success + '18',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.success + '40',
  },
  resolvedText: { color: COLORS.success, fontSize: 16, fontWeight: '800' },
});
