import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import { Issue, IssueStatus } from '@/types';
import { CATEGORY_CONFIG, COLORS, DELAY_THRESHOLD_MS } from '@/constants';
import StatusBadge from './StatusBadge';

interface Props {
  issue: Issue;
  onAction?: (issue: Issue, newStatus: IssueStatus) => void;
}

function IssueCard({ issue, onAction }: Props) {
  const router = useRouter();
  const config = CATEGORY_CONFIG[issue.category];
  const isDelayed =
    issue.status !== 'RESOLVED' &&
    Date.now() - issue.createdAt > DELAY_THRESHOLD_MS;
  const timeAgo = formatDistanceToNow(new Date(issue.createdAt), { addSuffix: true });

  const nextStatus: IssueStatus | null =
    issue.status === 'OPEN'
      ? 'IN_PROGRESS'
      : issue.status === 'IN_PROGRESS'
      ? 'RESOLVED'
      : null;

  const actionLabel =
    issue.status === 'OPEN' ? 'Start' : issue.status === 'IN_PROGRESS' ? 'Resolve' : null;

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: config.color }, isDelayed && styles.cardDelayed]}
      onPress={() => router.push(`/issue/${issue.id}`)}
      activeOpacity={0.75}
    >
      <View style={styles.header}>
        <View style={[styles.categoryTag, { backgroundColor: config.color + '22' }]}>
          <Text style={[styles.categoryText, { color: config.color }]}>
            {config.emoji} {config.label}
          </Text>
        </View>
        <StatusBadge status={issue.status} size="sm" />
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {issue.description}
      </Text>

      <View style={styles.footer}>
        <Text style={styles.meta}>🪑 Table {issue.tableNumber}</Text>
        <Text style={[styles.meta, isDelayed && styles.metaDelayed]}>
          {isDelayed ? '⚠️ ' : '🕐 '}{timeAgo}
        </Text>
      </View>

      {onAction && nextStatus && actionLabel && (
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: config.color }]}
          onPress={(e) => {
            e.stopPropagation();
            onAction(issue, nextStatus);
          }}
        >
          <Text style={styles.actionBtnText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}

      {issue.isOfflineCreated && (
        <View style={styles.offlineTag}>
          <Text style={styles.offlineText}>⏳ Pending sync</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default memo(IssueCard);

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 5,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardDelayed: {
    borderWidth: 1,
    borderLeftWidth: 5,
    borderColor: COLORS.error,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryText: { fontSize: 12, fontWeight: '700' },
  description: {
    color: COLORS.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  meta: { color: COLORS.textSecondary, fontSize: 12 },
  metaDelayed: { color: COLORS.error, fontWeight: '700' },
  actionBtn: {
    marginTop: 10,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  offlineTag: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.warning + '22',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  offlineText: { color: COLORS.warning, fontSize: 11, fontWeight: '600' },
});
