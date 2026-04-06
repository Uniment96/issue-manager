import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { IssueStatus } from '@/types';
import { STATUS_CONFIG } from '@/constants';

interface Props {
  status: IssueStatus;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'md' }: Props) {
  const config = STATUS_CONFIG[status];
  const isSmall = size === 'sm';

  return (
    <View style={[styles.badge, { backgroundColor: config.color }]}>
      <Text style={[styles.text, isSmall && styles.textSmall]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  textSmall: {
    fontSize: 11,
    paddingHorizontal: 0,
  },
});
