import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DishHealthStatus } from '../types';
import { HEALTH_STATUS_CONFIG } from '../constants';

interface Props {
  status: DishHealthStatus;
  score: number;
  compact?: boolean;
}

export default function DishHealthBadge({ status, score, compact = false }: Props) {
  const config = HEALTH_STATUS_CONFIG[status];

  if (compact) {
    return (
      <View style={[styles.compact, { backgroundColor: config.color + '20', borderColor: config.color + '60' }]}>
        <Text style={[styles.compactText, { color: config.color }]}>
          {config.emoji} {score}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.badge, { backgroundColor: config.color + '18', borderColor: config.color + '50' }]}>
      <Text style={styles.emoji}>{config.emoji}</Text>
      <View>
        <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
        <Text style={[styles.score, { color: config.color }]}>{score}/100</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  emoji: { fontSize: 22 },
  label: { fontSize: 13, fontWeight: '800' },
  score: { fontSize: 11, fontWeight: '600', opacity: 0.8 },
  compact: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  compactText: { fontSize: 12, fontWeight: '800' },
});
