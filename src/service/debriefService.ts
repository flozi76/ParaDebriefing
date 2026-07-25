import * as Crypto from 'expo-crypto';

import { DEFAULT_LOCATION } from '../constants';
import { formatDateInput, formatTimeInput } from '../utils/dateUtils';
import type { DebriefCategories, DebriefEntry, DebriefForm, DebriefMetaForm } from '../types';

export const createEmptyForm = (): DebriefForm => ({
  thumb: '',
  index: '',
  middle: '',
  ring: '',
  little: '',
});

export const createEmptyCategories = (): DebriefCategories => ({
  thumb: [],
  index: [],
  middle: [],
  ring: [],
  little: [],
});

export const createDefaultMetaForm = (): DebriefMetaForm => {
  const now = new Date();

  return {
    flightDate: formatDateInput(now),
    flightTime: formatTimeInput(now),
    location: DEFAULT_LOCATION,
    externalLink: '',
  };
};

const parseLegacyCreatedAt = (
  createdAt: string,
): { flightDate: string; flightTime: string } | null => {
  // Matches legacy locale format: DD.MM.YYYY, HH:MM
  const match = /^(\d{1,2})\.(\d{1,2})\.(\d{4}),?\s+(\d{1,2}):(\d{2})/.exec(createdAt);

  if (!match) {
    return null;
  }

  const [, day, month, year, hours, minutes] = match;

  return {
    flightDate: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
    flightTime: `${hours.padStart(2, '0')}:${minutes}`,
  };
};

export const normalizeEntry = (entry: DebriefEntry): DebriefEntry => {
  const parsedDateTime = parseLegacyCreatedAt(entry.createdAt);
  const fallbackMeta = createDefaultMetaForm();
  const fallbackCategories = createEmptyCategories();

  return {
    ...entry,
    meta: {
      flightDate:
        entry.meta?.flightDate ?? parsedDateTime?.flightDate ?? fallbackMeta.flightDate,
      flightTime:
        entry.meta?.flightTime ?? parsedDateTime?.flightTime ?? fallbackMeta.flightTime,
      location: entry.meta?.location ?? fallbackMeta.location,
      externalLink: entry.meta?.externalLink ?? '',
    },
    categories: {
      thumb: entry.categories?.thumb ?? fallbackCategories.thumb,
      index: entry.categories?.index ?? fallbackCategories.index,
      middle: entry.categories?.middle ?? fallbackCategories.middle,
      ring: entry.categories?.ring ?? fallbackCategories.ring,
      little: entry.categories?.little ?? fallbackCategories.little,
    },
  };
};

export const buildNewEntry = (
  meta: DebriefMetaForm,
  responses: DebriefForm,
  categories: DebriefCategories,
): DebriefEntry => ({
  id: Crypto.randomUUID(),
  createdAt: new Date().toLocaleString('de-DE'),
  meta,
  responses,
  categories,
});

export const trimForm = (form: DebriefForm): DebriefForm =>
  Object.fromEntries(
    Object.entries(form).map(([key, value]) => [key, value.trim()]),
  ) as DebriefForm;

export const trimMetaForm = (
  meta: DebriefMetaForm,
): DebriefMetaForm => ({
  flightDate: meta.flightDate.trim(),
  flightTime: meta.flightTime.trim(),
  location: meta.location.trim() || DEFAULT_LOCATION,
  externalLink: meta.externalLink.trim(),
});
