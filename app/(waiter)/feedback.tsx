import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  FlatList,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useDishStore } from '@/store/dishStore';
import { subscribeToDishes, submitDishFeedback } from '@/services/firebase/dishService';
import { COLORS, DISH_ISSUE_TAG_CONFIG } from '@/constants';
import { Dish, DishIssueTag } from '@/types';

const ALL_TAGS = Object.entries(DISH_ISSUE_TAG_CONFIG) as [DishIssueTag, { label: string; emoji: string }][];

function StarSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity key={n} onPress={() => onChange(n)} activeOpacity={0.7}>
          <Text style={[styles.starBtn, { opacity: n <= value ? 1 : 0.25 }]}>★</Text>
        </TouchableOpacity>
      ))}
      {value > 0 && (
        <Text style={[
          styles.ratingLabel,
          { color: value >= 4 ? COLORS.success : value === 3 ? COLORS.warning : COLORS.error }
        ]}>
          {value === 1 ? 'Very Bad' : value === 2 ? 'Poor' : value === 3 ? 'OK' : value === 4 ? 'Good' : 'Excellent!'}
        </Text>
      )}
    </View>
  );
}

export default function DishFeedbackScreen() {
  const user = useAuthStore((s) => s.user);
  const { showToast } = useUIStore();
  const { dishes, setDishes } = useDishStore();

  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [dishSearch, setDishSearch] = useState('');
  const [showDishPicker, setShowDishPicker] = useState(false);
  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<DishIssueTag[]>([]);
  const [comment, setComment] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsub = subscribeToDishes((d) => setDishes(d.filter((dish) => dish.isActive)));
    return unsub;
  }, []);

  const toggleTag = useCallback((tag: DishIssueTag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  const resetForm = useCallback(() => {
    setSelectedDish(null);
    setDishSearch('');
    setRating(0);
    setSelectedTags([]);
    setComment('');
    setTableNumber('');
  }, []);

  const handleSubmit = async () => {
    if (!selectedDish) { showToast('Select a dish', 'warning'); return; }
    if (rating === 0) { showToast('Add a rating', 'warning'); return; }
    if (rating <= 3 && selectedTags.length === 0) {
      showToast('Please add at least one issue tag for low ratings', 'warning');
      return;
    }
    if (!tableNumber.trim()) { showToast('Enter table number', 'warning'); return; }
    if (!user) return;

    setSubmitting(true);
    try {
      await submitDishFeedback({
        dishId: selectedDish.id,
        dishName: selectedDish.name,
        rating,
        issueTags: selectedTags,
        comment: comment.trim() || undefined,
        tableNumber: tableNumber.trim(),
        submittedBy: user.uid,
        submittedByName: user.displayName,
      });
      showToast('Feedback submitted!', 'success');
      resetForm();
      router.back();
    } catch {
      showToast('Failed to submit feedback. Try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredDishes = dishes.filter((d) =>
    d.name.toLowerCase().includes(dishSearch.toLowerCase())
  );

  const tagsRequired = rating > 0 && rating <= 3;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Rate a Dish</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Dish Selector */}
        <View style={styles.section}>
          <Text style={styles.label}>Dish *</Text>
          <TouchableOpacity
            style={styles.dishSelector}
            onPress={() => setShowDishPicker(true)}
            activeOpacity={0.8}
          >
            <Text style={[styles.dishSelectorText, !selectedDish && styles.placeholder]}>
              {selectedDish ? `${selectedDish.name}` : 'Select dish...'}
            </Text>
            <Text style={styles.chevron}>▼</Text>
          </TouchableOpacity>
        </View>

        {/* Table Number */}
        <View style={styles.section}>
          <Text style={styles.label}>Table Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 7"
            placeholderTextColor={COLORS.textSecondary}
            value={tableNumber}
            onChangeText={setTableNumber}
            keyboardType="number-pad"
            maxLength={4}
          />
        </View>

        {/* Rating */}
        <View style={styles.section}>
          <Text style={styles.label}>Rating *</Text>
          <StarSelector value={rating} onChange={setRating} />
        </View>

        {/* Issue Tags */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Issue Tags {tagsRequired ? '* (required for low ratings)' : '(optional)'}
          </Text>
          {tagsRequired && (
            <Text style={styles.tagHint}>
              Rating ≤ 3 — select what went wrong:
            </Text>
          )}
          <View style={styles.tagsGrid}>
            {ALL_TAGS.map(([tag, cfg]) => {
              const selected = selectedTags.includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  style={[styles.tagChip, selected && styles.tagChipSelected]}
                  onPress={() => toggleTag(tag)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.tagChipText}>
                    {cfg.emoji} {cfg.label}
                  </Text>
                  {selected && <Text style={styles.tagCheck}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Comment */}
        <View style={styles.section}>
          <Text style={styles.label}>Comment (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Any additional notes..."
            placeholderTextColor={COLORS.textSecondary}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, (rating === 0 || submitting) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={rating === 0 || submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>⭐  Submit Feedback</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Dish Picker Modal */}
      <Modal
        visible={showDishPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDishPicker(false)}
      >
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Dish</Text>
            <TouchableOpacity onPress={() => setShowDishPicker(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search dishes..."
            placeholderTextColor={COLORS.textSecondary}
            value={dishSearch}
            onChangeText={setDishSearch}
            autoFocus
          />
          <FlatList
            data={filteredDishes}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.dishOption,
                  selectedDish?.id === item.id && styles.dishOptionSelected,
                ]}
                onPress={() => {
                  setSelectedDish(item);
                  setShowDishPicker(false);
                  setDishSearch('');
                }}
              >
                <Text style={styles.dishOptionName}>{item.name}</Text>
                <Text style={styles.dishOptionCat}>{item.category}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyDishes}>
                {dishes.length === 0 ? 'No dishes added yet' : 'No matches found'}
              </Text>
            }
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surfaceAlt },
  flex: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 48 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backBtn: { padding: 4 },
  backText: { color: COLORS.accent, fontWeight: '700', fontSize: 15 },
  title: { fontSize: 20, fontWeight: '900', color: COLORS.textPrimary },
  section: { marginBottom: 20 },
  label: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  dishSelector: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dishSelectorText: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  placeholder: { color: COLORS.textSecondary, fontWeight: '400' },
  chevron: { color: COLORS.textSecondary, fontSize: 12 },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: { minHeight: 80, paddingTop: 12 },
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  starBtn: { fontSize: 36, color: '#f39c12' },
  ratingLabel: { fontSize: 14, fontWeight: '700', marginLeft: 4 },
  tagHint: { fontSize: 12, color: COLORS.error, fontWeight: '600', marginBottom: 8 },
  tagsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  tagChipSelected: {
    backgroundColor: COLORS.accent + '15',
    borderColor: COLORS.accent,
  },
  tagChipText: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '600' },
  tagCheck: { fontSize: 12, color: COLORS.accent, fontWeight: '900' },
  submitBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  submitBtnDisabled: { opacity: 0.5, shadowOpacity: 0 },
  submitBtnText: { color: '#fff', fontSize: 17, fontWeight: '900' },
  // Modal
  modal: { flex: 1, backgroundColor: COLORS.surface },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '900', color: COLORS.textPrimary },
  modalClose: { fontSize: 18, color: COLORS.textSecondary, padding: 4 },
  searchInput: {
    margin: 12,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dishOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dishOptionSelected: { backgroundColor: COLORS.accent + '10' },
  dishOptionName: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  dishOptionCat: { fontSize: 12, color: COLORS.textSecondary, textTransform: 'capitalize' },
  emptyDishes: { textAlign: 'center', color: COLORS.textSecondary, padding: 32, fontSize: 15 },
});
