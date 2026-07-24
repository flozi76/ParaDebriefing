import * as Crypto from 'expo-crypto';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { WebView } from 'react-native-webview';

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
const FALLBACK_COORDS = { lat: 47.5, lon: 11.5 }; // Alps region – central paragliding area

const createEmptyForm = (): DebriefForm => ({
  thumb: '',
  index: '',
  middle: '',
  ring: '',
  little: '',
});

const formatDateInput = (date: Date) => date.toISOString().slice(0, 10);

const formatTimeInput = (date: Date) => date.toTimeString().slice(0, 5);

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

const isValidDateInput = (date: string) =>
  !toOverviewDate(date, '').startsWith('Unbekanntes Datum');

const isValidTimeInput = (time: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time);

const generateMapHtml = (lat: number, lon: number): string =>
  `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body, html { width: 100%; height: 100%; overflow: hidden; }
    #map { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { center: [${lat}, ${lon}], zoom: 13 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '\\u00a9 OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);
    map.on('moveend', function() {
      var c = map.getCenter();
      window.ReactNativeWebView.postMessage(JSON.stringify({ lat: c.lat, lon: c.lng }));
    });
    window.ReactNativeWebView.postMessage(JSON.stringify({ lat: ${lat}, lon: ${lon} }));
  </script>
</body>
</html>`;

const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { 'Accept-Language': 'de', 'User-Agent': 'ParaDebriefing/1.0' } },
    );
    if (!resp.ok) throw new Error('HTTP error');
    const data = (await resp.json()) as {
      address?: {
        village?: string;
        town?: string;
        city_district?: string;
        city?: string;
        county?: string;
        state?: string;
        country?: string;
      };
      display_name?: string;
    };
    const a = data.address ?? {};
    const locality =
      a.village ?? a.town ?? a.city_district ?? a.city ?? a.county ?? a.state;
    if (locality && a.country) return `${locality}, ${a.country}`;
    if (locality) return locality;
    if (data.display_name) return data.display_name;
    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  }
};

type GpsCoords = { lat: number; lon: number };

function LocationPickerModal({
  visible,
  initialCoords,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  initialCoords: GpsCoords;
  onConfirm: (coords: GpsCoords) => void;
  onCancel: () => void;
}) {
  const [pickerCoords, setPickerCoords] = useState<GpsCoords>(initialCoords);
  const [mapHtml, setMapHtml] = useState('');
  const prevVisibleRef = useRef(false);

  useEffect(() => {
    const wasVisible = prevVisibleRef.current;
    prevVisibleRef.current = visible;
    if (visible && !wasVisible) {
      setPickerCoords(initialCoords);
      setMapHtml(generateMapHtml(initialCoords.lat, initialCoords.lon));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialCoords.lat, initialCoords.lon]);

  const handleMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      try {
        const data = JSON.parse(event.nativeEvent.data) as GpsCoords;
        if (typeof data.lat === 'number' && typeof data.lon === 'number') {
          setPickerCoords(data);
        }
      } catch {}
    },
    [],
  );

  return (
    <Modal animationType="slide" onRequestClose={onCancel} visible={visible}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.locationPickerHeader}>
          <Text style={styles.sectionTitle}>Flugort auswählen</Text>
          <Pressable
            accessibilityLabel="Karte schließen"
            accessibilityRole="button"
            onPress={onCancel}
            style={({ pressed }) => [styles.closeButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </Pressable>
        </View>

        <View style={styles.mapContainer}>
          <WebView
            javaScriptEnabled
            onMessage={handleMessage}
            source={{ html: mapHtml }}
            style={styles.flex}
          />
          <View pointerEvents="none" style={styles.crosshairOverlay}>
            <View style={styles.crosshairVertical} />
            <View style={styles.crosshairHorizontal} />
          </View>
        </View>

        <View style={styles.locationPickerFooter}>
          <Text style={styles.coordsText}>
            {pickerCoords.lat.toFixed(5)}°, {pickerCoords.lon.toFixed(5)}°
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => onConfirm(pickerCoords)}
            style={({ pressed }) => [
              styles.button,
              styles.dialogPrimaryButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.buttonText}>Bestätigen</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

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
  const [isLocationPickerVisible, setIsLocationPickerVisible] = useState(false);
  const [locationPickerCoords, setLocationPickerCoords] = useState<GpsCoords>(FALLBACK_COORDS);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

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
    setIsLocationPickerVisible(false);
    setEditingEntryId(null);
    setForm(createEmptyForm());
    setMetaForm(createDefaultMetaForm());
    setErrorMessage('');
    setIsLoadingLocation(false);
    setLocationPickerCoords(FALLBACK_COORDS);
  };

  const fetchGpsForDialog = async (setInitialLocation: boolean) => {
    setIsLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude: lat, longitude: lon } = pos.coords;
      setLocationPickerCoords({ lat, lon });
      if (setInitialLocation) {
        const name = await reverseGeocode(lat, lon);
        setMetaForm((current) => ({
          ...current,
          location:
            current.location === DEFAULT_LOCATION ? name : current.location,
        }));
      }
    } catch {} finally {
      setIsLoadingLocation(false);
    }
  };

  const openCreateDialog = () => {
    setEditingEntryId(null);
    setForm(createEmptyForm());
    setMetaForm(createDefaultMetaForm());
    setErrorMessage('');
    setLocationPickerCoords(FALLBACK_COORDS);
    setIsDialogVisible(true);
    void fetchGpsForDialog(true);
  };

  const openEditDialog = (entry: DebriefEntry) => {
    setEditingEntryId(entry.id);
    setForm(entry.responses);
    setMetaForm(entry.meta);
    setErrorMessage('');
    setLocationPickerCoords(FALLBACK_COORDS);
    setIsDialogVisible(true);
    void fetchGpsForDialog(false);
  };

  const updateMetaField = (field: keyof DebriefMetaForm, value: string) => {
    setMetaForm((current) => ({ ...current, [field]: value }));
    setErrorMessage('');
  };

  const handleLocationPickerConfirm = async (coords: GpsCoords) => {
    setIsLocationPickerVisible(false);
    setIsLoadingLocation(true);
    setLocationPickerCoords(coords);
    try {
      const name = await reverseGeocode(coords.lat, coords.lon);
      updateMetaField('location', name);
    } catch {
      updateMetaField('location', `${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`);
    } finally {
      setIsLoadingLocation(false);
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

    if (!isValidDateInput(metaForm.flightDate.trim())) {
      setErrorMessage('Bitte Datum im Format YYYY-MM-DD eingeben.');
      return;
    }

    if (!isValidTimeInput(metaForm.flightTime.trim())) {
      setErrorMessage('Bitte Uhrzeit im Format HH:MM eingeben.');
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
                  <TextInput
                    accessibilityLabel="Flugdatum"
                    placeholder="Datum (YYYY-MM-DD)"
                    placeholderTextColor="#7a8da3"
                    style={styles.metaInput}
                    value={metaForm.flightDate}
                    onChangeText={(value) => updateMetaField('flightDate', value)}
                    autoCapitalize="none"
                    keyboardType="numbers-and-punctuation"
                  />
                  <TextInput
                    accessibilityLabel="Flugzeit"
                    placeholder="Uhrzeit (HH:MM)"
                    placeholderTextColor="#7a8da3"
                    style={styles.metaInput}
                    value={metaForm.flightTime}
                    onChangeText={(value) => updateMetaField('flightTime', value)}
                    autoCapitalize="none"
                    keyboardType="numbers-and-punctuation"
                  />
                  <Pressable
                    accessibilityLabel="Flugort auswählen"
                    accessibilityRole="button"
                    onPress={() => setIsLocationPickerVisible(true)}
                    style={({ pressed }) => [
                      styles.metaInput,
                      styles.locationPickerButton,
                      pressed && styles.buttonPressed,
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.locationPickerText,
                        !metaForm.location && styles.locationPickerPlaceholder,
                      ]}
                    >
                      {isLoadingLocation
                        ? 'Standort wird ermittelt\u2026'
                        : (metaForm.location || 'Standort auswählen')}
                    </Text>
                    <Text style={styles.locationPickerIcon}>📍</Text>
                  </Pressable>
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

      <LocationPickerModal
        initialCoords={locationPickerCoords}
        onCancel={() => setIsLocationPickerVisible(false)}
        onConfirm={handleLocationPickerConfirm}
        visible={isLocationPickerVisible}
      />
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
  locationPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationPickerText: {
    flex: 1,
    fontSize: 15,
    color: '#17324b',
  },
  locationPickerPlaceholder: {
    color: '#7a8da3',
  },
  locationPickerIcon: {
    fontSize: 18,
    marginLeft: 8,
  },
  locationPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#c7d7e7',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  crosshairOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crosshairVertical: {
    position: 'absolute',
    width: 2,
    height: 40,
    backgroundColor: '#e53e3e',
    borderRadius: 1,
  },
  crosshairHorizontal: {
    position: 'absolute',
    width: 40,
    height: 2,
    backgroundColor: '#e53e3e',
    borderRadius: 1,
  },
  locationPickerFooter: {
    padding: 16,
    paddingBottom: 24,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#c7d7e7',
    backgroundColor: '#eef5fb',
  },
  coordsText: {
    fontSize: 13,
    color: '#415a73',
    textAlign: 'center',
  },
});
