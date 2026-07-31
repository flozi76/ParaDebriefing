import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { FINGER_CATEGORIES, FINGER_FIELDS } from '../constants';
import { styles } from '../styles/styles';
import { toOverviewDate } from '../utils/dateUtils';
import { HandIcon } from './HandIcon';
import type { DebriefEntry } from '../types';

interface ViewDialogProps {
  entry: DebriefEntry | null;
  onClose: () => void;
  onEdit: (entry: DebriefEntry) => void;
  onOpenLink: (url: string) => void;
}

export function ViewDialog({ entry, onClose, onEdit, onOpenLink }: ViewDialogProps) {
  if (!entry) return null;

  const overviewDate = toOverviewDate(entry.meta.flightDate, entry.meta.flightTime);

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={entry !== null}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalWrapper}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.sectionTitle} numberOfLines={1}>
                {overviewDate}
              </Text>
              <Pressable
                accessibilityLabel="Dialog schließen"
                accessibilityRole="button"
                onPress={onClose}
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.viewMetaCard}>
                {entry.meta.location ? (
                  <View style={styles.viewMetaRow}>
                    <Text style={styles.viewMetaLabel}>📍</Text>
                    <Text style={styles.viewMetaValue}>{entry.meta.location}</Text>
                  </View>
                ) : null}
                {entry.meta.externalLink ? (
                  <View style={styles.viewMetaRow}>
                    <Text style={styles.viewMetaLabel}>🔗</Text>
                    <Pressable
                      accessibilityRole="link"
                      onPress={() => onOpenLink(entry.meta.externalLink)}
                      style={({ pressed }) => pressed && styles.buttonPressed}
                    >
                      <Text style={styles.viewLinkText} numberOfLines={1}>
                        {entry.meta.externalLink}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>

              {FINGER_FIELDS.map((field) => {
                const selectedCategories = (entry.categories?.[field.key] ?? [])
                  .map((id) =>
                    FINGER_CATEGORIES[field.key].categories.find((c) => c.id === id),
                  )
                  .filter(Boolean);
                const responseText = entry.responses[field.key];
                const hasContent = selectedCategories.length > 0 || responseText.trim().length > 0;

                return (
                  <View key={field.key} style={styles.viewFieldGroup}>
                    <View style={styles.fieldHeader}>
                      <HandIcon activeParts={field.activeParts} />
                      <View style={styles.fieldLabelGroup}>
                        <Text style={styles.fieldLabel}>{field.title}</Text>
                        <Text style={styles.fieldPrompt}>{field.prompt}</Text>
                      </View>
                    </View>
                    {hasContent ? (
                      <View style={styles.viewFieldContent}>
                        {selectedCategories.length > 0 ? (
                          <View style={styles.viewChipsRow}>
                            {selectedCategories.map((cat) =>
                              cat ? (
                                <View key={cat.id} style={styles.viewChip}>
                                  <Text style={styles.viewChipText}>{cat.label}</Text>
                                </View>
                              ) : null,
                            )}
                          </View>
                        ) : null}
                        {responseText.trim().length > 0 ? (
                          <Text style={styles.viewResponseText}>{responseText.trim()}</Text>
                        ) : null}
                      </View>
                    ) : (
                      <Text style={styles.viewEmptyField}>Keine Angaben</Text>
                    )}
                  </View>
                );
              })}

              <View style={styles.dialogActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={onClose}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text style={styles.secondaryButtonText}>Schließen</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    onClose();
                    onEdit(entry);
                  }}
                  style={({ pressed }) => [
                    styles.button,
                    styles.dialogPrimaryButton,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text style={styles.buttonText}>Bearbeiten</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}
