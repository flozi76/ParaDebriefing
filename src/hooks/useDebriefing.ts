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
    () => Object.values(form).every((value) => value.trim().length > 0),
    [form],
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
    setLocationPickerCoords(FALLBACK_COORDS);
    setIsDialogVisible(true);
    void fetchGpsForDialog(false);
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
  };
}
