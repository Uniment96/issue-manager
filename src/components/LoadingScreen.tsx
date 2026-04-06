import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { COLORS } from '@/constants';

export default function LoadingScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>🍽️</Text>
      <ActivityIndicator size="large" color={COLORS.accent} style={styles.spinner} />
      <Text style={styles.text}>Loading...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  logo: { fontSize: 52, marginBottom: 24 },
  spinner: { marginBottom: 12 },
  text: {
    color: COLORS.textLight,
    fontSize: 16,
    opacity: 0.7,
  },
});
