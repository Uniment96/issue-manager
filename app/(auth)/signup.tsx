import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { COLORS } from '@/constants';

export default function SignupScreen() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { register, isLoading } = useAuthStore();
  const showToast = useUIStore((s) => s.showToast);

  const handleSignup = async () => {
    if (!displayName.trim() || !email.trim() || !password.trim()) {
      showToast('Please fill in all fields', 'warning');
      return;
    }
    if (password !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }
    if (password.length < 6) {
      showToast('Password must be at least 6 characters', 'warning');
      return;
    }
    try {
      // All self-registered users are managers — they build their own team after signing up
      await register(email.trim(), password, displayName.trim(), 'manager');
    } catch (err: any) {
      showToast(err.message ?? 'Sign up failed. Try again.', 'error');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.logo}>🍽️</Text>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Set up your restaurant's issue manager</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Your Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. John Smith"
              placeholderTextColor={COLORS.textSecondary}
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              returnKeyType="next"
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor={COLORS.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Min. 6 characters"
              placeholderTextColor={COLORS.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="next"
            />

            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Re-enter password"
              placeholderTextColor={COLORS.textSecondary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleSignup}
            />

            <View style={styles.roleNote}>
              <Text style={styles.roleNoteText}>
                You'll be signed up as a <Text style={styles.roleNoteHighlight}>Manager</Text>.
                After signing in, use the <Text style={styles.roleNoteHighlight}>+ Staff</Text> button
                to add your team members with their roles.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
              onPress={handleSignup}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
            <Text style={styles.backLinkText}>Already have an account? Sign In</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.primary },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 28 },
  logo: { fontSize: 48, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '900', color: COLORS.textLight },
  subtitle: { fontSize: 14, color: COLORS.accent, fontWeight: '600', marginTop: 4, textAlign: 'center' },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 16,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  roleNote: {
    marginTop: 20,
    backgroundColor: COLORS.accent + '12',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.accent + '30',
  },
  roleNoteText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  roleNoteHighlight: {
    color: COLORS.accent,
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  submitBtnDisabled: { opacity: 0.6, shadowOpacity: 0 },
  submitBtnText: { color: '#fff', fontSize: 18, fontWeight: '900' },
  backLink: { alignItems: 'center', paddingVertical: 8 },
  backLinkText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
});
