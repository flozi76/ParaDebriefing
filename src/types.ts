import type { FINGER_FIELDS } from './constants';

export type FingerKey = (typeof FINGER_FIELDS)[number]['key'];

export type DebriefForm = Record<FingerKey, string>;

export type DebriefCategories = Record<FingerKey, string[]>;

export type DebriefMetaForm = {
  flightDate: string;
  flightTime: string;
  location: string;
  externalLink: string;
};

export type DebriefEntry = {
  id: string;
  createdAt: string;
  meta: DebriefMetaForm;
  responses: DebriefForm;
  categories?: DebriefCategories;
};

export type GpsCoords = { lat: number; lon: number };
