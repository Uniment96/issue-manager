import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useUIStore } from '@/store/uiStore';
import { COLORS } from '@/constants';

const TYPE_COLORS: Record<string, string> = {
  success: COLORS.success,
  error: COLORS.error,
  warning: COLORS.warning,
  info: COLORS.info,
};

export default function Toast() {
  const { toast, hideToast } = useUIStore();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (toast) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 20, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [toast]);

  if (!toast) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: TYPE_COLORS[toast.type] ?? COLORS.info, opacity, transform: [{ translateY }] },
      ]}
    >
      <TouchableOpacity onPress={hideToast} style={styles.inner} activeOpacity={0.9}>
        <Text style={styles.text}>{toast.message}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 90,
    left: 16,
    right: 16,
    borderRadius: 14,
    zIndex: 9999,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  inner: { padding: 16 },
  text: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
});
