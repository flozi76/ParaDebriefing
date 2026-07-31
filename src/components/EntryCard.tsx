import { Alert, Pressable, Text, View } from 'react-native';

import { styles } from '../styles/styles';
import { toOverviewDate } from '../utils/dateUtils';
import type { DebriefEntry } from '../types';

interface EntryCardProps {
  entry: DebriefEntry;
  onView: (entry: DebriefEntry) => void;
  onEdit: (entry: DebriefEntry) => void;
  onDelete: (id: string) => void;
  onOpenLink: (url: string) => void;
}

export function EntryCard({ entry, onView, onEdit, onDelete, onOpenLink }: EntryCardProps) {
  const overviewDate = toOverviewDate(entry.meta.flightDate, entry.meta.flightTime);
  const accessibilityDate = overviewDate.startsWith('Unbekanntes Datum')
    ? 'unbekanntem Datum'
    : overviewDate;

  const handleDelete = () => {
    Alert.alert(
      'Debriefing löschen',
      `Debriefing vom ${accessibilityDate} wirklich löschen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: () => onDelete(entry.id),
        },
      ],
    );
  };

  return (
    <View style={styles.entryCard}>
      <View style={styles.entryTopRow}>
        <View style={styles.entryOverviewRow}>
          <Text style={styles.entryDate}>{overviewDate}</Text>
          <Text style={styles.entryLocation}>{entry.meta.location}</Text>
        </View>
        <View style={styles.entryActions}>
          {entry.meta.externalLink ? (
            <Pressable
              accessibilityLabel={`Externen Link vom Flug am ${accessibilityDate} öffnen`}
              accessibilityRole="button"
              onPress={() => {
                onOpenLink(entry.meta.externalLink);
              }}
              style={({ pressed }) => [
                styles.actionButton,
                styles.actionButtonLink,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.actionButtonIcon}>🔗</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityLabel={`Debriefing vom ${accessibilityDate} anzeigen`}
            accessibilityRole="button"
            onPress={() => onView(entry)}
            style={({ pressed }) => [
              styles.actionButton,
              styles.actionButtonView,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.actionButtonIcon}>👁</Text>
          </Pressable>
          <Pressable
            accessibilityLabel={`Debriefing vom ${accessibilityDate} bearbeiten`}
            accessibilityRole="button"
            onPress={() => onEdit(entry)}
            style={({ pressed }) => [
              styles.actionButton,
              styles.actionButtonEdit,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.actionButtonIcon}>✏️</Text>
          </Pressable>
          <Pressable
            accessibilityLabel={`Debriefing vom ${accessibilityDate} löschen`}
            accessibilityRole="button"
            onPress={handleDelete}
            style={({ pressed }) => [
              styles.actionButton,
              styles.actionButtonDelete,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.actionButtonIcon}>🗑</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
