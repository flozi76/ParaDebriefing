import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
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

type DebriefEntry = {
  id: string;
  createdAt: string;
  responses: DebriefForm;
};

const STORAGE_KEY = 'paradebriefing.entries';

const createEmptyForm = (): DebriefForm => ({
  thumb: '',
  index: '',
  middle: '',
  ring: '',
  little: '',
});

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
  const [entries, setEntries] = useState<DebriefEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [storageMessage, setStorageMessage] = useState('');
  const [hasLoadedEntries, setHasLoadedEntries] = useState(false);
  const [isDialogVisible, setIsDialogVisible] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  useEffect(() => {
    const loadEntries = async () => {
      try {
        const storedEntries = await AsyncStorage.getItem(STORAGE_KEY);

        if (!storedEntries) {
          return;
        }

        const parsedEntries = JSON.parse(storedEntries) as DebriefEntry[];
        setEntries(parsedEntries);
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
    setErrorMessage('');
  };

  const openCreateDialog = () => {
    setEditingEntryId(null);
    setForm(createEmptyForm());
    setErrorMessage('');
    setIsDialogVisible(true);
  };

  const openEditDialog = (entry: DebriefEntry) => {
    setEditingEntryId(entry.id);
    setForm(entry.responses);
    setErrorMessage('');
    setIsDialogVisible(true);
  };

  const saveDebrief = () => {
    if (!isComplete) {
      setErrorMessage('Bitte alle fünf Finger ausfüllen.');
      return;
    }

    const trimmedResponses = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [key, value.trim()]),
    ) as DebriefForm;

    if (editingEntryId) {
      setEntries((current) =>
        current.map((entry) =>
          entry.id === editingEntryId
            ? { ...entry, responses: trimmedResponses }
            : entry,
        ),
      );
    } else {
      setEntries((current) => [
        {
          id: Crypto.randomUUID(),
          createdAt: new Date().toLocaleString('de-DE'),
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
              entries.map((entry) => (
                <View key={entry.id} style={styles.entryCard}>
                  <View style={styles.entryTopRow}>
                    <Text style={styles.entryDate}>{entry.createdAt}</Text>
                    <Pressable
                      accessibilityLabel={`Debriefing vom ${entry.createdAt} bearbeiten`}
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
                  {FINGER_FIELDS.map((field) => (
                    <View key={field.key} style={styles.entrySection}>
                      <View style={styles.entryHeader}>
                        <HandIcon activeParts={field.activeParts} />
                        <Text style={styles.entryLabel}>{field.title}</Text>
                      </View>
                      <Text style={styles.entryText}>
                        {entry.responses[field.key]}
                      </Text>
                    </View>
                  ))}
                </View>
              ))
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
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  entrySection: {
    gap: 4,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  entryLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#12304a',
  },
  entryText: {
    fontSize: 15,
    lineHeight: 21,
    color: '#415a73',
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
