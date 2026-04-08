import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useIssueStore } from '@/store/issueStore';
import { useUIStore } from '@/store/uiStore';
import { useIssueSubscription } from '@/hooks/useIssueSubscription';
import { createIssue } from '@/services/firebase/issueService';
import { apiCreateIssue } from '@/services/api/issueApi';
import { enqueueOperation } from '@/services/offline/offlineQueue';
import CategoryButton from '@/components/CategoryButton';
import IssueCard from '@/components/IssueCard';
import VoiceInput from '@/components/VoiceInput';
import { COLORS } from '@/constants';
import { IssueCategory, Issue } from '@/types';

const generateLocalId = () =>
  `offline-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const CATEGORIES: IssueCategory[] = ['food', 'service', 'billing', 'hygiene'];

export default function WaiterDashboard() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { issues, isLoading, addOptimisticIssue, updateOptimisticIssue } = useIssueStore();
  const { showToast, isOnline } = useUIStore();

  const [selectedCategory, setSelectedCategory] = useState<IssueCategory | null>(null);
  const [tableNumber, setTableNumber] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const descRef = useRef<TextInput>(null);

  useIssueSubscription();

  const resetForm = useCallback(() => {
    setTableNumber('');
    setDescription('');
    setSelectedCategory(null);
  }, []);

  const handleVoiceComplete = useCallback((uri: string) => {
    setDescription((prev) =>
      prev ? `${prev} [🎤 voice note]` : `[🎤 voice note recorded]`
    );
    showToast('Voice note attached', 'success');
  }, [showToast]);

  const handleSubmit = async () => {
    if (!selectedCategory) {
      showToast('Select an issue category', 'warning');
      return;
    }
    if (!tableNumber.trim()) {
      showToast('Enter table number', 'warning');
      return;
    }
    if (!description.trim()) {
      showToast('Describe the issue', 'warning');
      return;
    }
    if (!user) return;

    setSubmitting(true);
    const localId = generateLocalId();
    const payload = {
      category: selectedCategory,
      description: description.trim(),
      tableNumber: tableNumber.trim(),
    };
    const optimistic: Issue = {
      id: localId,
      ...payload,
      status: 'OPEN',
      createdBy: user.uid,
      createdByName: user.displayName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isOfflineCreated: true,
    };

    addOptimisticIssue(optimistic);
    const capturedDescription = description.trim();
    const capturedTable = tableNumber.trim();
    const capturedCategory = selectedCategory;
    resetForm();

    if (!isOnline) {
      await enqueueOperation({
        id: localId,
        type: 'CREATE_ISSUE',
        payload,
        createdAt: Date.now(),
      });
      showToast('Issue queued — will sync when online', 'warning');
      setSubmitting(false);
      return;
    }

    try {
      const firestoreId = await createIssue(payload, user.uid, user.displayName);
      updateOptimisticIssue(localId, { id: firestoreId, isOfflineCreated: false });
      apiCreateIssue(payload).catch(() => null); // non-blocking REST mirror
      showToast('Issue reported!', 'success');
    } catch {
      showToast('Failed to submit issue. Saved for retry.', 'error');
      await enqueueOperation({
        id: localId,
        type: 'CREATE_ISSUE',
        payload: { category: capturedCategory!, description: capturedDescription, tableNumber: capturedTable },
        createdAt: Date.now(),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Report Issue</Text>
              <Text style={styles.headerSub}>Hi, {user?.displayName?.split(' ')[0]}</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.rateDishBtn}
                onPress={() => router.push('/(waiter)/feedback')}
                activeOpacity={0.8}
              >
                <Text style={styles.rateDishText}>⭐ Rate Dish</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Category selection */}
          <Text style={styles.sectionLabel}>Select Issue Type</Text>
          <View style={styles.categoryGrid}>
            <View style={styles.categoryRow}>
              {CATEGORIES.slice(0, 2).map((cat) => (
                <CategoryButton
                  key={cat}
                  category={cat}
                  selected={selectedCategory === cat}
                  onPress={setSelectedCategory}
                />
              ))}
            </View>
            <View style={styles.categoryRow}>
              {CATEGORIES.slice(2, 4).map((cat) => (
                <CategoryButton
                  key={cat}
                  category={cat}
                  selected={selectedCategory === cat}
                  onPress={setSelectedCategory}
                />
              ))}
            </View>
          </View>

          {/* Issue Form */}
          <View style={styles.form}>
            <Text style={styles.sectionLabel}>Issue Details</Text>

            <TextInput
              style={styles.tableInput}
              placeholder="Table number  e.g. 12"
              placeholderTextColor={COLORS.textSecondary}
              value={tableNumber}
              onChangeText={setTableNumber}
              keyboardType="number-pad"
              returnKeyType="next"
              onSubmitEditing={() => descRef.current?.focus()}
              maxLength={4}
            />

            <View style={styles.descRow}>
              <TextInput
                ref={descRef}
                style={styles.descInput}
                placeholder="Describe the issue..."
                placeholderTextColor={COLORS.textSecondary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                returnKeyType="done"
              />
              <VoiceInput onRecordingComplete={handleVoiceComplete} />
            </View>

            <TouchableOpacity
              style={[
                styles.submitBtn,
                (!selectedCategory || submitting) && styles.submitBtnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!selectedCategory || submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>🚨  Report Issue</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* My Recent Issues */}
          <Text style={styles.sectionLabel}>My Recent Issues</Text>
          {isLoading ? (
            <ActivityIndicator color={COLORS.accent} style={styles.loader} />
          ) : issues.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>✅</Text>
              <Text style={styles.emptyText}>No issues reported yet</Text>
            </View>
          ) : (
            <FlatList
              data={issues}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <IssueCard issue={item} />}
              scrollEnabled={false}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surfaceAlt },
  flex: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  headerSub: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  rateDishBtn: {
    backgroundColor: '#f39c12' + '18',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f39c12' + '50',
  },
  rateDishText: { color: '#e67e22', fontWeight: '700', fontSize: 13 },
  logoutBtn: {
    backgroundColor: COLORS.error + '18',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.error + '40',
  },
  logoutText: { color: COLORS.error, fontWeight: '700', fontSize: 13 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 4,
  },
  categoryGrid: { marginBottom: 20 },
  categoryRow: { flexDirection: 'row', marginBottom: 0 },
  form: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  tableInput: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  descRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 14,
  },
  descInput: {
    flex: 1,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 80,
  },
  submitBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  submitBtnDisabled: { opacity: 0.5, shadowOpacity: 0 },
  submitBtnText: { color: '#fff', fontSize: 17, fontWeight: '900' },
  loader: { marginVertical: 20 },
  emptyState: { alignItems: 'center', paddingVertical: 32 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyText: { color: COLORS.textSecondary, fontSize: 15 },
});
