import React, { memo } from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { IssueCategory } from '@/types';
import { CATEGORY_CONFIG } from '@/constants';

interface Props {
  category: IssueCategory;
  selected: boolean;
  onPress: (category: IssueCategory) => void;
}

function CategoryButton({ category, selected, onPress }: Props) {
  const config = CATEGORY_CONFIG[category];

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { borderColor: config.color, backgroundColor: selected ? config.color : config.color + '18' },
        selected && styles.selectedShadow,
      ]}
      onPress={() => onPress(category)}
      activeOpacity={0.7}
    >
      <Text style={styles.emoji}>{config.emoji}</Text>
      <Text style={[styles.label, { color: selected ? '#fff' : config.color }]}>
        {config.label}
      </Text>
      {selected && (
        <View style={styles.check}>
          <Text style={styles.checkText}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default memo(CategoryButton);

const styles = StyleSheet.create({
  button: {
    flex: 1,
    margin: 6,
    height: 96,
    borderRadius: 18,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  selectedShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  emoji: { fontSize: 30, marginBottom: 5 },
  label: { fontSize: 15, fontWeight: '800' },
  check: {
    position: 'absolute',
    top: 8,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.3)',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkText: { color: '#fff', fontSize: 12, fontWeight: '900' },
});
