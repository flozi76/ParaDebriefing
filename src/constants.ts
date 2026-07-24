export const HAND_PARTS = ['thumb', 'index', 'middle', 'ring', 'little'] as const;

export const FINGER_FIELDS = [
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

export const STORAGE_KEY = 'paradebriefing.entries';
export const DEFAULT_LOCATION = 'Aktueller Standort';
export const MIN_OVERVIEW_ROW_WIDTH = 220;
// Alps region – central paragliding area
export const FALLBACK_COORDS = { lat: 47.5, lon: 11.5 };
