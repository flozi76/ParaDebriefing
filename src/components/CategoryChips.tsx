import { Pressable, ScrollView, Text, View } from 'react-native';

import { FINGER_CATEGORIES } from '../constants';
import { styles } from '../styles/styles';
import type { FingerKey } from '../types';

interface CategoryChipsProps {
  fingerKey: FingerKey;
  selected: string[];
  onToggle: (categoryId: string) => void;
}

export function CategoryChips({ fingerKey, selected, onToggle }: CategoryChipsProps) {
  const { categories } = FINGER_CATEGORIES[fingerKey];

  return (
    <View style={styles.categoryChipsContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryChipsScroll}
      >
        {categories.map((cat) => {
          const isSelected = selected.includes(cat.id);
          return (
            <Pressable
              key={cat.id}
              accessibilityLabel={cat.label}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
              onPress={() => onToggle(cat.id)}
              style={({ pressed }) => [
                styles.categoryChip,
                isSelected && styles.categoryChipSelected,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  isSelected && styles.categoryChipTextSelected,
                ]}
              >
                {cat.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
