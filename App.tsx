import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const HAND_PARTS = ['thumb', 'index', 'middle', 'ring', 'little'] as const;

const FINGER_FIELDS = [
  {
    key: 'thumb',
    title: 'Daumen',
    prompt: 'Was war super?',
    activeParts: ['thumb'],
    placeholder:
      'Lob, positive Erlebnisse, gelungene Manöver oder schöne Momente in der Thermik.',
  },
  {
    key: 'index',
    title: 'Zeigefinger',
    prompt: 'Was habe ich gelernt?',
    activeParts: ['thumb', 'index'],
    placeholder:
      'Neue Erkenntnisse, Beobachtungen zum Wetter oder taktische Entscheidungen.',
  },
  {
    key: 'middle',
    title: 'Mittelfinger',
    prompt: 'Was lief schlecht / Was kann verbessert werden?',
    activeParts: ['thumb', 'index', 'middle'],
    placeholder:
      'Fehler, Stresssituationen, verpasste Anschlüsse oder unpräzises Steuern.',
  },
  {
    key: 'ring',
    title: 'Ringfinger',
    prompt: 'Was nehme ich mit?',
    activeParts: ['thumb', 'index', 'middle', 'ring'],
    placeholder:
      'Das persönliche Fazit, Kernwissen oder bleibende Eindrücke für den nächsten Flug.',
  },
  {
    key: 'little',
    title: 'Kleiner Finger',
    prompt: 'Was kam zu kurz?',
    activeParts: ['thumb', 'index', 'middle', 'ring', 'little'],
    placeholder:
      'Übersehene Details, mangelnde Vorbereitung, zu wenig Trinken/Essen oder offene Wünsche.',
  },
] as const;

type FingerKey = (typeof FINGER_FIELDS)[number]['key'];
type DebriefForm = Record<FingerKey, string>;

type DebriefMetaForm = {
  flightDate: string;
  flightTime: string;
  location: string;
  externalLink: string;
};

type DebriefEntry = {
  id: string;
  createdAt: string;
  meta: DebriefMetaForm;
  responses: DebriefForm;
};

const STORAGE_KEY = 'paradebriefing.entries';
const DEFAULT_LOCATION = 'Aktueller Standort';
const MIN_OVERVIEW_ROW_WIDTH = 220;

const createEmptyForm = (): DebriefForm => ({
  thumb: '',
  index: '',
  middle: '',
  ring: '',
  little: '',
});

const formatDateInput = (date: Date) => date.toISOString().slice(0, 10);

const formatTimeInput = (date: Date) => date.toTimeString().slice(0, 5);

const combineDateAndTime = (date: string, time: string): Date => {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  const now = new Date();
  const year = dateMatch ? Number(dateMatch[1]) : now.getFullYear();
  const month = dateMatch ? Number(dateMatch[2]) - 1 : now.getMonth();
  const day = dateMatch ? Number(dateMatch[3]) : now.getDate();
  const hours = timeMatch ? Number(timeMatch[1]) : now.getHours();
  const minutes = timeMatch ? Number(timeMatch[2]) : now.getMinutes();
  return new Date(year, month, day, hours, minutes, 0, 0);
};

const createDefaultMetaForm = (): DebriefMetaForm => {
  const now = new Date();

  return {
    flightDate: formatDateInput(now),
    flightTime: formatTimeInput(now),
    location: DEFAULT_LOCATION,
    externalLink: '',
  };
};

const parseLegacyCreatedAt = (createdAt: string) => {
  // Matches legacy locale format: DD.MM.YYYY, HH:MM
  const match = /^(\d{1,2})\.(\d{1,2})\.(\d{4}),?\s+(\d{1,2}):(\d{2})/.exec(
    createdAt,
  );

  if (!match) {
    return null;
  }

  const [, day, month, year, hours, minutes] = match;

  return {
    flightDate: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
    flightTime: `${hours.padStart(2, '0')}:${minutes}`,
  };
};

const normalizeEntry = (entry: DebriefEntry): DebriefEntry => {
  const parsedDateTime = parseLegacyCreatedAt(entry.createdAt);
  const fallbackMeta = createDefaultMetaForm();

  return {
    ...entry,
    meta: {
      flightDate:
        entry.meta?.flightDate ??
        parsedDateTime?.flightDate ??
        fallbackMeta.flightDate,
      flightTime:
        entry.meta?.flightTime ??
        parsedDateTime?.flightTime ??
        fallbackMeta.flightTime,
      location: entry.meta?.location ?? fallbackMeta.location,
      externalLink: entry.meta?.externalLink ?? '',
    },
  };
};

const toOverviewDate = (date: string, time: string) => {
  const normalizedTime = time.trim() || '--:--';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);

  if (!match) {
    return `Unbekanntes Datum · ${normalizedTime}`;
  }

  const [, year, month, day] = match;
  const validatedDate = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
  );
  const isValidDate =
    !Number.isNaN(validatedDate.getTime()) &&
    validatedDate.getFullYear() === Number(year) &&
    validatedDate.getMonth() === Number(month) - 1 &&
    validatedDate.getDate() === Number(day);

  if (!isValidDate) {
    return `Unbekanntes Datum · ${normalizedTime}`;
  }

  return `${day}.${month}.${year} · ${normalizedTime}`;
};

function HandIcon({
  activeParts,
}: {
  activeParts: readonly (typeof HAND_PARTS)[number][];
}) {
  const isActive = (part: (typeof HAND_PARTS)[number]) => activeParts.includes(part);

  return (
    <View style={styles.handIcon} accessible={false}>
      <View style={styles.handFingers}>
        <View
          style={[
            styles.handFinger,
            styles.handLittleFinger,
            isActive('little') ? styles.handPartActive : styles.handPartInactive,
            !isActive('little') && styles.handFingerClosed,
          ]}
        />
        <View
          style={[
            styles.handFinger,
            styles.handRingFinger,
            isActive('ring') ? styles.handPartActive : styles.handPartInactive,
            !isActive('ring') && styles.handFingerClosed,
          ]}
        />
        <View
          style={[
            styles.handFinger,
            styles.handMiddleFinger,
            isActive('middle') ? styles.handPartActive : styles.handPartInactive,
            !isActive('middle') && styles.handFingerClosed,
          ]}
        />
        <View
          style={[
            styles.handFinger,
            styles.handIndexFinger,
            isActive('index') ? styles.handPartActive : styles.handPartInactive,
            !isActive('index') && styles.handFingerClosed,
          ]}
        />
      </View>
      <View style={styles.handBase}>
        <View style={[styles.handPalm, styles.handPartActive]} />
        <View
          style={[
            styles.handThumb,
            isActive('thumb') ? styles.handPartActive : styles.handPartInactive,
            !isActive('thumb') && styles.handThumbClosed,
          ]}
        />
      </View>
    </View>
  );
}

export default function App() {
  const [form, setForm] = useState<DebriefForm>(createEmptyForm);
  const [metaForm, setMetaForm] = useState<DebriefMetaForm>(createDefaultMetaForm);
  const [entries, setEntries] = useState<DebriefEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [storageMessage, setStorageMessage] = useState('');
  const [hasLoadedEntries, setHasLoadedEntries] = useState(false);
  const [isDialogVisible, setIsDialogVisible] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerStep, setPickerStep] = useState<'date' | 'time'>('date');
  const [pendingDate, setPendingDate] = useState<Date>(new Date());

  useEffect(() => {
    const loadEntries = async () => {
      try {
        const storedEntries = await AsyncStorage.getItem(STORAGE_KEY);

        if (!storedEntries) {
          return;
        }

        const parsedEntries = JSON.parse(storedEntries) as DebriefEntry[];
        setEntries(parsedEntries.map(normalizeEntry));
      } catch {
        await AsyncStorage.removeItem(STORAGE_KEY);
        setStorageMessage(
          'Gespeicherte Debriefings konnten nicht geladen werden und wurden zurückgesetzt.',
        );
      } finally {
        setHasLoadedEntries(true);
      }
    };

    void loadEntries();
  }, []);

  useEffect(() => {
    if (!hasLoadedEntries) {
      return;
    }

    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries, hasLoadedEntries]);

  const isComplete = useMemo(
    () => Object.values(form).every((value) => value.trim().length > 0),
    [form],
  );

  const updateField = (field: FingerKey, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrorMessage('');
  };

  const closeDialog = () => {
    setIsDialogVisible(false);
    setEditingEntryId(null);
    setForm(createEmptyForm());
    setMetaForm(createDefaultMetaForm());
    setErrorMessage('');
  };

  const openCreateDialog = () => {
    setEditingEntryId(null);
    setForm(createEmptyForm());
    setMetaForm(createDefaultMetaForm());
    setErrorMessage('');
    setIsDialogVisible(true);
  };

  const openEditDialog = (entry: DebriefEntry) => {
    setEditingEntryId(entry.id);
    setForm(entry.responses);
    setMetaForm(entry.meta);
    setErrorMessage('');
    setIsDialogVisible(true);
  };

  const updateMetaField = (field: keyof DebriefMetaForm, value: string) => {
    setMetaForm((current) => ({ ...current, [field]: value }));
    setErrorMessage('');
  };

  const openDateTimePicker = () => {
    setPendingDate(combineDateAndTime(metaForm.flightDate, metaForm.flightTime));
    setPickerStep('date');
    setShowPicker(true);
  };

  const onPickerChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (event.type === 'dismissed' || !selectedDate) {
        return;
      }
      if (pickerStep === 'date') {
        setPendingDate(selectedDate);
        updateMetaField('flightDate', formatDateInput(selectedDate));
        setPickerStep('time');
        setShowPicker(true);
      } else {
        const combined = new Date(pendingDate);
        combined.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
        updateMetaField('flightTime', formatTimeInput(combined));
        setPickerStep('date');
      }
    } else {
      if (selectedDate) {
        setPendingDate(selectedDate);
        updateMetaField('flightDate', formatDateInput(selectedDate));
        updateMetaField('flightTime', formatTimeInput(selectedDate));
      }
    }
  };

  const openExternalLink = async (url: string) => {
    const normalizedUrl = url.trim();
    const errorText = 'Externer Link konnte nicht geöffnet werden.';

    if (!normalizedUrl) {
      setStorageMessage(errorText);
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(normalizedUrl);
    } catch {
      setStorageMessage(errorText);
      return;
    }

    const protocol = parsedUrl.protocol.toLowerCase();
    if (protocol !== 'http:' && protocol !== 'https:') {
      setStorageMessage(errorText);
      return;
    }

    const canOpen = await Linking.canOpenURL(parsedUrl.toString());
    if (!canOpen) {
      setStorageMessage(errorText);
      return;
    }

    try {
      await Linking.openURL(parsedUrl.toString());
      setStorageMessage('');
    } catch {
      setStorageMessage(errorText);
    }
  };

  const saveDebrief = () => {
    if (!isComplete) {
      setErrorMessage('Bitte alle fünf Finger ausfüllen.');
      return;
    }

    const trimmedResponses = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [key, value.trim()]),
    ) as DebriefForm;
    const trimmedMeta: DebriefMetaForm = {
      flightDate: metaForm.flightDate.trim(),
      flightTime: metaForm.flightTime.trim(),
      location: metaForm.location.trim() || DEFAULT_LOCATION,
      externalLink: metaForm.externalLink.trim(),
    };

    if (editingEntryId) {
      setEntries((current) =>
        current.map((entry) =>
          entry.id === editingEntryId
            ? { ...entry, meta: trimmedMeta, responses: trimmedResponses }
            : entry,
        ),
      );
    } else {
      setEntries((current) => [
        {
          id: Crypto.randomUUID(),
          createdAt: new Date().toLocaleString('de-DE'),
          meta: trimmedMeta,
          responses: trimmedResponses,
        },
        ...current,
      ]);
    }

    closeDialog();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <View style={styles.headerTextGroup}>
                <Text style={styles.title}>ParaDebriefing</Text>
                <Text style={styles.subtitle}>
                  Fünf-Finger-Debriefing nach dem Flug direkt auf Android und iPhone.
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Neues Debriefing"
                accessibilityRole="button"
                onPress={openCreateDialog}
                style={({ pressed }) => [
                  styles.iconButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.iconButtonText}>+</Text>
              </Pressable>
            </View>
            {storageMessage ? (
              <Text style={styles.storageMessage}>{storageMessage}</Text>
            ) : null}
          </View>

          <View style={styles.card}>
            <View style={styles.listHeader}>
              <Text style={styles.sectionTitle}>Gespeicherte Debriefings</Text>
              <Text style={styles.badge}>{entries.length}</Text>
            </View>

            {entries.length === 0 ? (
              <View style={styles.emptyStateGroup}>
                <Text style={styles.emptyState}>
                  Noch kein Debriefing gespeichert. Tippe auf Plus, um nach deinem nächsten Flug alle fünf Finger zu erfassen.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={openCreateDialog}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text style={styles.secondaryButtonText}>Debriefing anlegen</Text>
                </Pressable>
              </View>
            ) : (
              entries.map((entry) => {
                const overviewDate = toOverviewDate(
                  entry.meta.flightDate,
                  entry.meta.flightTime,
                );
                const accessibilityDate = overviewDate.startsWith('Unbekanntes Datum')
                  ? 'unbekanntem Datum'
                  : overviewDate;

                return (
                  <View key={entry.id} style={styles.entryCard}>
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
                            void openExternalLink(entry.meta.externalLink);
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
                        onPress={() => openEditDialog(entry)}
                        style={({ pressed }) => [
                          styles.editButton,
                          pressed && styles.buttonPressed,
                        ]}
                      >
                        <Text style={styles.editButtonText}>Bearbeiten</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        animationType="slide"
        onRequestClose={closeDialog}
        transparent
        visible={isDialogVisible}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalWrapper}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.sectionTitle}>
                  {editingEntryId ? 'Debriefing bearbeiten' : 'Neues Debriefing'}
                </Text>
                <Pressable
                  accessibilityLabel="Dialog schließen"
                  accessibilityRole="button"
                  onPress={closeDialog}
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
                <View style={styles.metaFieldsCard}>
                  <Pressable
                    accessibilityLabel="Flugdatum und -uhrzeit"
                    accessibilityRole="button"
                    onPress={openDateTimePicker}
                    style={({ pressed }) => [
                      styles.metaDateButton,
                      pressed && styles.buttonPressed,
                    ]}
                  >
                    <Text style={styles.metaDateButtonText}>
                      {toOverviewDate(metaForm.flightDate, metaForm.flightTime)}
                    </Text>
                  </Pressable>
                  {showPicker && (
                    Platform.OS === 'ios' ? (
                      <View>
                        <DateTimePicker
                          value={pendingDate}
                          mode="datetime"
                          display="spinner"
                          onChange={onPickerChange}
                          locale="de-DE"
                        />
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => setShowPicker(false)}
                          style={({ pressed }) => [
                            styles.pickerDoneButton,
                            pressed && styles.buttonPressed,
                          ]}
                        >
                          <Text style={styles.pickerDoneButtonText}>Fertig</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <DateTimePicker
                        value={pendingDate}
                        mode={pickerStep}
                        display="default"
                        onChange={onPickerChange}
                      />
                    )
                  )}
                  <TextInput
                    accessibilityLabel="Flugort"
                    placeholder="Standort"
                    placeholderTextColor="#7a8da3"
                    style={styles.metaInput}
                    value={metaForm.location}
                    onChangeText={(value) => updateMetaField('location', value)}
                  />
                  <TextInput
                    accessibilityLabel="Optionaler externer Link"
                    placeholder="Optionaler Link (z.B. XContest)"
                    placeholderTextColor="#7a8da3"
                    style={styles.metaInput}
                    value={metaForm.externalLink}
                    onChangeText={(value) => updateMetaField('externalLink', value)}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                {FINGER_FIELDS.map((field) => (
                  <View key={field.key} style={styles.fieldGroup}>
                    <View style={styles.fieldHeader}>
                      <HandIcon activeParts={field.activeParts} />
                      <View style={styles.fieldLabelGroup}>
                        <Text style={styles.fieldLabel}>{field.title}</Text>
                        <Text style={styles.fieldPrompt}>{field.prompt}</Text>
                      </View>
                    </View>
                    <TextInput
                      multiline
                      numberOfLines={4}
                      placeholder={field.placeholder}
                      placeholderTextColor="#7a8da3"
                      style={styles.input}
                      value={form[field.key]}
                      onChangeText={(value) => updateField(field.key, value)}
                      textAlignVertical="top"
                    />
                  </View>
                ))}

                {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

                <View style={styles.dialogActions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={closeDialog}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      pressed && styles.buttonPressed,
                    ]}
                  >
                    <Text style={styles.secondaryButtonText}>Abbrechen</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={saveDebrief}
                    style={({ pressed }) => [
                      styles.button,
                      styles.dialogPrimaryButton,
                      pressed && styles.buttonPressed,
                    ]}
                  >
                    <Text style={styles.buttonText}>
                      {editingEntryId ? 'Änderungen speichern' : 'Debriefing speichern'}
                    </Text>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#eef5fb',
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  header: {
    gap: 8,
    paddingTop: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  headerTextGroup: {
    flex: 1,
    gap: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#12304a',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    color: '#415a73',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    gap: 14,
    shadowColor: '#12304a',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#12304a',
  },
  fieldGroup: {
    gap: 8,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fieldLabelGroup: {
    flex: 1,
    gap: 2,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#12304a',
  },
  fieldPrompt: {
    fontSize: 14,
    lineHeight: 20,
    color: '#1f4668',
  },
  input: {
    minHeight: 92,
    borderWidth: 1,
    borderColor: '#c7d7e7',
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#f9fbfd',
    fontSize: 15,
    lineHeight: 21,
    color: '#17324b',
  },
  metaFieldsCard: {
    gap: 10,
  },
  metaInput: {
    borderWidth: 1,
    borderColor: '#c7d7e7',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f9fbfd',
    fontSize: 15,
    color: '#17324b',
  },
  metaDateButton: {
    borderWidth: 1,
    borderColor: '#c7d7e7',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f9fbfd',
  },
  metaDateButtonText: {
    fontSize: 15,
    color: '#17324b',
    fontWeight: '600',
  },
  pickerDoneButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pickerDoneButtonText: {
    fontSize: 16,
    color: '#0f6cbd',
    fontWeight: '700',
  },
  error: {
    color: '#b42318',
    fontWeight: '600',
  },
  storageMessage: {
    color: '#9a6700',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#0f6cbd',
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    minWidth: 32,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
    textAlign: 'center',
    backgroundColor: '#dbeafe',
    color: '#0f4c81',
    fontWeight: '700',
  },
  emptyState: {
    fontSize: 15,
    lineHeight: 22,
    color: '#587086',
  },
  emptyStateGroup: {
    gap: 14,
  },
  entryCard: {
    borderWidth: 1,
    borderColor: '#d6e2ee',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    backgroundColor: '#f9fbfd',
  },
  entryDate: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f4668',
  },
  entryTopRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  entryOverviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: MIN_OVERVIEW_ROW_WIDTH,
  },
  entryLocation: {
    fontSize: 14,
    color: '#415a73',
    flexShrink: 1,
  },
  linkButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#95c6ef',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#edf6ff',
  },
  linkButtonText: {
    color: '#0f4c81',
    fontSize: 14,
    fontWeight: '700',
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: '#0f6cbd',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  iconButtonText: {
    color: '#ffffff',
    fontSize: 28,
    lineHeight: 28,
    fontWeight: '700',
  },
  secondaryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#c7d7e7',
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  secondaryButtonText: {
    color: '#1f4668',
    fontSize: 16,
    fontWeight: '700',
  },
  editButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#c7d7e7',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
  },
  editButtonText: {
    color: '#1f4668',
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(18, 48, 74, 0.45)',
    justifyContent: 'flex-end',
  },
  modalWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '92%',
    backgroundColor: '#eef5fb',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    paddingBottom: 24,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dbeafe',
  },
  closeButtonText: {
    color: '#12304a',
    fontSize: 20,
    fontWeight: '700',
  },
  modalContent: {
    gap: 14,
    paddingBottom: 12,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: 12,
  },
  dialogPrimaryButton: {
    flex: 1,
  },
  handIcon: {
    width: 48,
    height: 52,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  handFingers: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    marginBottom: 2,
  },
  handFinger: {
    width: 7,
    borderRadius: 999,
  },
  handLittleFinger: {
    height: 18,
  },
  handRingFinger: {
    height: 24,
  },
  handMiddleFinger: {
    height: 28,
  },
  handIndexFinger: {
    height: 26,
  },
  handFingerClosed: {
    height: 8,
  },
  handBase: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  handThumb: {
    width: 8,
    height: 20,
    borderRadius: 999,
    transform: [{ rotate: '45deg' }],
    marginLeft: -5,
    marginBottom: 2,
  },
  handThumbClosed: {
    height: 10,
  },
  handPalm: {
    width: 28,
    height: 20,
    borderRadius: 10,
  },
  handPartActive: {
    backgroundColor: '#12304a',
  },
  handPartInactive: {
    backgroundColor: '#bfd2e6',
  },
});
