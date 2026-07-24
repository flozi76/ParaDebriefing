import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const FINGER_FIELDS = [
  {
    key: 'thumb',
    title: 'Daumen',
    prompt: 'Was war super?',
    placeholder:
      'Lob, positive Erlebnisse, gelungene Manöver oder schöne Momente in der Thermik.',
  },
  {
    key: 'index',
    title: 'Zeigefinger',
    prompt: 'Was habe ich gelernt?',
    placeholder:
      'Neue Erkenntnisse, Beobachtungen zum Wetter oder taktische Entscheidungen.',
  },
  {
    key: 'middle',
    title: 'Mittelfinger',
    prompt: 'Was lief schlecht / Was kann verbessert werden?',
    placeholder:
      'Fehler, Stresssituationen, verpasste Anschlüsse oder unpräzises Steuern.',
  },
  {
    key: 'ring',
    title: 'Ringfinger',
    prompt: 'Was nehme ich mit?',
    placeholder:
      'Das persönliche Fazit, Kernwissen oder bleibende Eindrücke für den nächsten Flug.',
  },
  {
    key: 'little',
    title: 'Kleiner Finger',
    prompt: 'Was kam zu kurz?',
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

export default function App() {
  const [form, setForm] = useState<DebriefForm>(createEmptyForm);
  const [entries, setEntries] = useState<DebriefEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [hasLoadedEntries, setHasLoadedEntries] = useState(false);

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

  const saveDebrief = () => {
    if (!isComplete) {
      setErrorMessage('Bitte alle fünf Finger ausfüllen.');
      return;
    }

    const trimmedResponses = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [key, value.trim()]),
    ) as DebriefForm;

    setEntries((current) => [
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        createdAt: new Date().toLocaleString('de-DE'),
        responses: trimmedResponses,
      },
      ...current,
    ]);
    setForm(createEmptyForm());
    setErrorMessage('');
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
            <Text style={styles.title}>ParaDebriefing</Text>
            <Text style={styles.subtitle}>
              Fünf-Finger-Debriefing nach dem Flug direkt auf Android und iPhone.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Neues Debriefing</Text>
            {FINGER_FIELDS.map((field) => (
              <View key={field.key} style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  {field.title} · {field.prompt}
                </Text>
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

            <Pressable
              accessibilityRole="button"
              onPress={saveDebrief}
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.buttonText}>Debriefing speichern</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <View style={styles.listHeader}>
              <Text style={styles.sectionTitle}>Gespeicherte Debriefings</Text>
              <Text style={styles.badge}>{entries.length}</Text>
            </View>

            {entries.length === 0 ? (
              <Text style={styles.emptyState}>
                Noch kein Debriefing gespeichert. Erfasse nach deinem nächsten Flug alle fünf Finger.
              </Text>
            ) : (
              entries.map((entry) => (
                <View key={entry.id} style={styles.entryCard}>
                  <Text style={styles.entryDate}>{entry.createdAt}</Text>
                  {FINGER_FIELDS.map((field) => (
                    <View key={field.key} style={styles.entrySection}>
                      <Text style={styles.entryLabel}>{field.title}</Text>
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
  fieldLabel: {
    fontSize: 15,
    fontWeight: '600',
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
  button: {
    backgroundColor: '#0f6cbd',
    borderRadius: 999,
    paddingVertical: 14,
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
  entrySection: {
    gap: 4,
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
});
