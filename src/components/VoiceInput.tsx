import React, { useState, useCallback, useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, View, Animated } from 'react-native';
import {
  startVoiceRecording,
  stopVoiceRecording,
} from '@/services/voice/voiceService';
import { useUIStore } from '@/store/uiStore';
import { COLORS } from '@/constants';

interface Props {
  onRecordingComplete: (uri: string) => void;
}

export default function VoiceInput({ onRecordingComplete }: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const { showToast, setVoiceRecording } = useUIStore();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseRef = useRef<Animated.CompositeAnimation | null>(null);

  const startPulse = useCallback(() => {
    pulseRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.25, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    pulseRef.current.start();
  }, [pulseAnim]);

  const stopPulse = useCallback(() => {
    pulseRef.current?.stop();
    Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
  }, [pulseAnim]);

  const handlePress = async () => {
    if (isRecording) {
      stopPulse();
      setIsRecording(false);
      setVoiceRecording(false);
      try {
        const uri = await stopVoiceRecording();
        if (uri) onRecordingComplete(uri);
      } catch {
        showToast('Failed to stop recording', 'error');
      }
    } else {
      try {
        await startVoiceRecording();
        setIsRecording(true);
        setVoiceRecording(true);
        startPulse();
      } catch {
        showToast('Microphone access denied', 'error');
      }
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity
          style={[styles.btn, isRecording && styles.btnRecording]}
          onPress={handlePress}
          activeOpacity={0.75}
        >
          <Text style={styles.icon}>{isRecording ? '⏹' : '🎤'}</Text>
        </TouchableOpacity>
      </Animated.View>
      <Text style={styles.label}>{isRecording ? 'Stop' : 'Voice'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  btn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.info + '18',
    borderWidth: 2,
    borderColor: COLORS.info,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnRecording: {
    backgroundColor: COLORS.error + '18',
    borderColor: COLORS.error,
  },
  icon: { fontSize: 24 },
  label: {
    marginTop: 4,
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
});
