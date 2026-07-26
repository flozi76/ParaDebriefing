import { Alert, Pressable, Text, View } from 'react-native';

import { styles } from '../styles/styles';
import { toOverviewDate } from '../utils/dateUtils';
import type { DebriefEntry } from '../types';

interface EntryCardProps {
  entry: DebriefEntry;
  onEdit: (entry: DebriefEntry) => void;
  onDelete: (id: string) => void;
  onOpenLink: (url: string) => void;
}

export function EntryCard({ entry, onEdit, onDelete, onOpenLink }: EntryCardProps) {
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
        {entry.meta.externalLink ? (
          <Pressable
            accessibilityLabel={`Externen Link vom Flug am ${accessibilityDate} öffnen`}
            accessibilityRole="button"
            onPress={() => {
              onOpenLink(entry.meta.externalLink);
            }}
            style={({ pressed }) => [
              styles.linkButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.linkButtonText}>Link</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityLabel={`Debriefing vom ${accessibilityDate} bearbeiten`}
          accessibilityRole="button"
          onPress={() => onEdit(entry)}
          style={({ pressed }) => [
            styles.editButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.editButtonText}>Bearbeiten</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={`Debriefing vom ${accessibilityDate} löschen`}
          accessibilityRole="button"
          onPress={handleDelete}
          style={({ pressed }) => [
            styles.deleteButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.deleteButtonText}>Löschen</Text>
        </Pressable>
      </View>
    </View>
  );
}
