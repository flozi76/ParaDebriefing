import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEY } from '../constants';
import type { DebriefEntry } from '../types';

export const loadEntries = async (): Promise<DebriefEntry[]> => {
  const storedEntries = await AsyncStorage.getItem(STORAGE_KEY);

  if (!storedEntries) {
    return [];
  }

  return JSON.parse(storedEntries) as DebriefEntry[];
};

export const saveEntries = async (entries: DebriefEntry[]): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
};

export const clearEntries = async (): Promise<void> => {
  await AsyncStorage.removeItem(STORAGE_KEY);
};
