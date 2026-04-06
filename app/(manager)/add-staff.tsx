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
import { useUIStore } from '@/store/uiStore';
import { COLORS } from '@/constants';
import { UserRole } from '@/types';
import { createStaffAccount } from '@/services/firebase/authService';

const ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: 'waiter', label: 'Waiter', description: 'Reports issues at tables' },
  { value: 'chef', label: 'Chef', description: 'Handles food-related issues' },
  { value: 'supervisor', label: 'Supervisor', description: 'Manages service & hygiene' },
  { value: 'manager', label: 'Manager', description: 'Full access to all issues' },
];

export default function AddStaffScreen() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('waiter');
  const [loading, setLoading] = useState(false);
  const showToast = useUIStore((s) => s.showToast);

  const handleCreate = async () => {
    if (!displayName.trim() || !email.trim() || !password.trim()) {
      showToast('Please fill in all fields', 'warning');
      return;
    }
    if (password.length < 6) {
      showToast('Password must be at least 6 characters', 'warning');
      return;
    }
    setLoading(true);
    try {
      await createStaffAccount(email.trim(), password, displayName.trim(), role);
      showToast(`Account created for ${displayName.trim()}`, 'success');
      router.back();
    } catch (err: any) {
      showToast(err.message ?? 'Failed to create account', 'error');
    } finally {
      setLoading(false);
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
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backBtnText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Add Staff Member</Text>
            <Text style={styles.subtitle}>
              Create login credentials for a new team member
            </Text>
          </View>

          <View style={styles.card}>
            {/* Name */}
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. John Smith"
              placeholderTextColor={COLORS.textSecondary}
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              returnKeyType="next"
            />

            {/* Email */}
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. john@restaurant.com"
              placeholderTextColor={COLORS.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
            />

            {/* Password */}
            <Text style={styles.label}>Temporary Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Min. 6 characters"
              placeholderTextColor={COLORS.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="done"
            />
            <Text style={styles.hint}>
              Share this password with the staff member. They can change it later.
            </Text>

            {/* Role picker */}
            <Text style={styles.label}>Role</Text>
            <View style={styles.roleList}>
              {ROLES.map((r) => (
                <TouchableOpacity
                  key={r.value}
                  style={[styles.roleRow, role === r.value && styles.roleRowActive]}
                  onPress={() => setRole(r.value)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.radio, role === r.value && styles.radioActive]}>
                    {role === r.value && <View style={styles.radioDot} />}
                  </View>
                  <View style={styles.roleText}>
                    <Text style={[styles.roleLabel, role === r.value && styles.roleLabelActive]}>
                      {r.label}
                    </Text>
                    <Text style={styles.roleDesc}>{r.description}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.createBtn, loading && styles.createBtnDisabled]}
              onPress={handleCreate}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.createBtnText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surfaceAlt },
  flex: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 40 },
  header: { marginBottom: 20 },
  backBtn: { marginBottom: 12 },
  backBtnText: { color: COLORS.accent, fontWeight: '700', fontSize: 15 },
  title: { fontSize: 26, fontWeight: '900', color: COLORS.textPrimary },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4, lineHeight: 20 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  hint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 6,
    lineHeight: 16,
  },
  roleList: { gap: 8, marginTop: 4 },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceAlt,
    gap: 12,
  },
  roleRowActive: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accent + '0d',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioActive: { borderColor: COLORS.accent },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.accent,
  },
  roleText: { flex: 1 },
  roleLabel: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  roleLabelActive: { color: COLORS.accent },
  roleDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  createBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  createBtnDisabled: { opacity: 0.6, shadowOpacity: 0 },
  createBtnText: { color: '#fff', fontSize: 17, fontWeight: '900' },
});
