import { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import { useEffect, useMemo, useState } from 'react';
import { Linking, Platform } from 'react-native';

import {
  buildNewEntry,
  createDefaultMetaForm,
  createEmptyCategories,
  createEmptyForm,
  normalizeEntry,
  trimForm,
  trimMetaForm,
} from '../service/debriefService';
import {
  clearEntries,
  loadEntries,
  saveEntries,
} from '../repository/debriefRepository';
import { combineDateAndTime, formatDateInput, formatTimeInput } from '../utils/dateUtils';
import { reverseGeocode } from '../utils/locationUtils';
import { DEFAULT_LOCATION, FALLBACK_COORDS, FINGER_CATEGORIES } from '../constants';
import type { DebriefCategories, DebriefEntry, DebriefForm, DebriefMetaForm, FingerKey, GpsCoords } from '../types';

export function useDebriefing() {
  const [form, setForm] = useState<DebriefForm>(createEmptyForm);
  const [categories, setCategories] = useState<DebriefCategories>(createEmptyCategories);
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
  const [showPicker, setShowPicker] = useState(false);
  const [pickerStep, setPickerStep] = useState<'date' | 'time'>('date');
  const [pendingDate, setPendingDate] = useState<Date>(new Date());

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await loadEntries();
        setEntries(stored.map(normalizeEntry));
      } catch {
        await clearEntries();
        setStorageMessage(
          'Gespeicherte Debriefings konnten nicht geladen werden und wurden zurückgesetzt.',
        );
      } finally {
        setHasLoadedEntries(true);
      }
    };

    void load();
  }, []);

  useEffect(() => {
    if (!hasLoadedEntries) {
      return;
    }

    void saveEntries(entries);
  }, [entries, hasLoadedEntries]);

  const isComplete = useMemo(
    () => (Object.keys(form) as FingerKey[]).every(
      (key) => form[key].trim().length > 0 || categories[key].length > 0,
    ),
    [form, categories],
  );

  const updateField = (field: FingerKey, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrorMessage('');
  };

  const updateCategory = (field: FingerKey, categoryId: string) => {
    const { selection } = FINGER_CATEGORIES[field];
    setCategories((current) => {
      const existing = current[field];
      if (selection === 'single') {
        return { ...current, [field]: existing[0] === categoryId ? [] : [categoryId] };
      }
      return {
        ...current,
        [field]: existing.includes(categoryId)
          ? existing.filter((id) => id !== categoryId)
          : [...existing, categoryId],
      };
    });
    setErrorMessage('');
  };

  const updateMetaField = (field: keyof DebriefMetaForm, value: string) => {
    setMetaForm((current) => ({ ...current, [field]: value }));
    setErrorMessage('');
  };

  const closeDialog = () => {
    setIsDialogVisible(false);
    setIsLocationPickerVisible(false);
    setEditingEntryId(null);
    setForm(createEmptyForm());
    setCategories(createEmptyCategories());
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
          gpsCoords:
            current.location === DEFAULT_LOCATION ? { lat, lon } : current.gpsCoords,
        }));
      }
    } catch {} finally {
      setIsLoadingLocation(false);
    }
  };

  const openCreateDialog = () => {
    setEditingEntryId(null);
    setForm(createEmptyForm());
    setCategories(createEmptyCategories());
    setMetaForm(createDefaultMetaForm());
    setErrorMessage('');
    setLocationPickerCoords(FALLBACK_COORDS);
    setIsDialogVisible(true);
    void fetchGpsForDialog(true);
  };

  const openEditDialog = (entry: DebriefEntry) => {
    setEditingEntryId(entry.id);
    setForm(entry.responses);
    setCategories(entry.categories ?? createEmptyCategories());
    setMetaForm(entry.meta);
    setErrorMessage('');
    setLocationPickerCoords(entry.meta.gpsCoords ?? FALLBACK_COORDS);
    setIsDialogVisible(true);
    const locationAlreadySet =
      !!entry.meta.location && entry.meta.location !== DEFAULT_LOCATION;
    if (!locationAlreadySet) {
      void fetchGpsForDialog(true);
    }
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

  const handleLocationPickerConfirm = async (coords: GpsCoords) => {
    setIsLocationPickerVisible(false);
    setIsLoadingLocation(true);
    setLocationPickerCoords(coords);
    try {
      const name = await reverseGeocode(coords.lat, coords.lon);
      setMetaForm((current) => ({ ...current, location: name, gpsCoords: coords }));
    } catch {
      setMetaForm((current) => ({
        ...current,
        location: `${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`,
        gpsCoords: coords,
      }));
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

  const deleteEntry = (id: string) => {
    setEntries((current) => current.filter((entry) => entry.id !== id));
  };

  const saveDebrief = () => {
    if (!isComplete) {
      setErrorMessage('Bitte alle fünf Finger ausfüllen (Text oder Badge).');
      return;
    }

    const trimmedResponses = trimForm(form);
    const trimmedMeta = trimMetaForm(metaForm);

    if (editingEntryId) {
      setEntries((current) =>
        current.map((entry) =>
          entry.id === editingEntryId
            ? { ...entry, meta: trimmedMeta, responses: trimmedResponses, categories }
            : entry,
        ),
      );
    } else {
      setEntries((current) => [buildNewEntry(trimmedMeta, trimmedResponses, categories), ...current]);
    }

    closeDialog();
  };

  return {
    form,
    categories,
    metaForm,
    entries,
    errorMessage,
    storageMessage,
    isDialogVisible,
    isEditing: editingEntryId !== null,
    isLocationPickerVisible,
    locationPickerCoords,
    hasStoredLocation: !!metaForm.gpsCoords,
    isLoadingLocation,
    showPicker,
    pickerStep,
    pendingDate,
    updateField,
    updateCategory,
    updateMetaField,
    closeDialog,
    openCreateDialog,
    openEditDialog,
    openDateTimePicker,
    openLocationPicker: () => setIsLocationPickerVisible(true),
    closeLocationPicker: () => setIsLocationPickerVisible(false),
    handleLocationPickerConfirm,
    onPickerChange,
    onPickerDone: () => setShowPicker(false),
    openExternalLink,
    saveDebrief,
    deleteEntry,
  };
}
