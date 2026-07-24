import { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useEffect, useMemo, useState } from 'react';
import { Linking, Platform } from 'react-native';

import {
  buildNewEntry,
  createDefaultMetaForm,
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
import type { DebriefEntry, DebriefForm, DebriefMetaForm, FingerKey } from '../types';

export function useDebriefing() {
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

  const updateMetaField = (field: keyof DebriefMetaForm, value: string) => {
    setMetaForm((current) => ({ ...current, [field]: value }));
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

    const trimmedResponses = trimForm(form);
    const trimmedMeta = trimMetaForm(metaForm);

    if (editingEntryId) {
      setEntries((current) =>
        current.map((entry) =>
          entry.id === editingEntryId
            ? { ...entry, meta: trimmedMeta, responses: trimmedResponses }
            : entry,
        ),
      );
    } else {
      setEntries((current) => [buildNewEntry(trimmedMeta, trimmedResponses), ...current]);
    }

    closeDialog();
  };

  return {
    form,
    metaForm,
    entries,
    errorMessage,
    storageMessage,
    isDialogVisible,
    isEditing: editingEntryId !== null,
    showPicker,
    pickerStep,
    pendingDate,
    updateField,
    updateMetaField,
    closeDialog,
    openCreateDialog,
    openEditDialog,
    openDateTimePicker,
    onPickerChange,
    onPickerDone: () => setShowPicker(false),
    openExternalLink,
    saveDebrief,
  };
}
