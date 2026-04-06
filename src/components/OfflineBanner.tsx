import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useUIStore } from '@/store/uiStore';
import { COLORS } from '@/constants';

export default function OfflineBanner() {
  const isOnline = useUIStore((s) => s.isOnline);

  if (isOnline) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>📡</Text>
      <Text style={styles.text}>Offline — changes will sync when reconnected</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.warning,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  icon: { fontSize: 14 },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'center',
  },
});
