import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatDistanceToNow } from 'date-fns';
import { DishFeedback } from '../types';
import { COLORS, DISH_ISSUE_TAG_CONFIG } from '../constants';

interface Props {
  feedback: DishFeedback;
  showDishName?: boolean;
}

function StarRow({ rating }: { rating: number }) {
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Text key={n} style={[styles.star, { opacity: n <= rating ? 1 : 0.25 }]}>
          ★
        </Text>
      ))}
    </View>
  );
}

export default function FeedbackCard({ feedback, showDishName = false }: Props) {
  const ratingColor =
    feedback.rating >= 4
      ? COLORS.success
      : feedback.rating === 3
      ? COLORS.warning
      : COLORS.error;

  const timeAgo = formatDistanceToNow(new Date(feedback.createdAt), { addSuffix: true });

  return (
    <View style={[styles.card, { borderLeftColor: ratingColor }]}>
      <View style={styles.top}>
        <View style={styles.topLeft}>
          {showDishName && (
            <Text style={styles.dishName}>{feedback.dishName}</Text>
          )}
          <View style={styles.ratingRow}>
            <StarRow rating={feedback.rating} />
            <Text style={[styles.ratingNum, { color: ratingColor }]}>
              {feedback.rating}/5
            </Text>
          </View>
        </View>
        <View style={styles.topRight}>
          <Text style={styles.table}>Table {feedback.tableNumber}</Text>
          <Text style={styles.time}>{timeAgo}</Text>
        </View>
      </View>

      {feedback.issueTags.length > 0 && (
        <View style={styles.tags}>
          {feedback.issueTags.map((tag) => {
            const cfg = DISH_ISSUE_TAG_CONFIG[tag];
            return (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>
                  {cfg.emoji} {cfg.label}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {feedback.comment ? (
        <Text style={styles.comment} numberOfLines={2}>
          "{feedback.comment}"
        </Text>
      ) : null}

      <Text style={styles.submitter}>by {feedback.submittedByName}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  topLeft: { flex: 1 },
  topRight: { alignItems: 'flex-end' },
  dishName: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stars: { flexDirection: 'row' },
  star: { fontSize: 15, color: '#f39c12' },
  ratingNum: { fontSize: 13, fontWeight: '800' },
  table: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  time: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  tag: {
    backgroundColor: COLORS.error + '12',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.error + '30',
  },
  tagText: { fontSize: 11, color: COLORS.error, fontWeight: '700' },
  comment: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: 8,
    lineHeight: 18,
  },
  submitter: { fontSize: 11, color: COLORS.textSecondary, marginTop: 6 },
});
