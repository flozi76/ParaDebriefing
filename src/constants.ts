export const HAND_PARTS = ['thumb', 'index', 'middle', 'ring', 'little'] as const;

export type FingerCategory = { id: string; label: string; phase: string };

export const FINGER_CATEGORIES: Record<
  'thumb' | 'index' | 'middle' | 'ring' | 'little',
  { selection: 'single' | 'multi'; categories: FingerCategory[] }
> = {
  thumb: {
    selection: 'multi',
    categories: [
      { id: 'thumb.great_day', label: 'Super Flugtag / Traumbedingungen', phase: 'preparation' },
      { id: 'thumb.clean_launch', label: 'Sauberer Start', phase: 'launch' },
      { id: 'thumb.core_centered', label: 'Bart sauber zentriert', phase: 'climb' },
      { id: 'thumb.connection_made', label: 'Anschluss geklappt', phase: 'cross_country' },
      { id: 'thumb.milestone', label: 'Persönlicher Meilenstein', phase: 'cross_country' },
      { id: 'thumb.good_decision', label: 'Gute Entscheidung getroffen', phase: 'cross_country' },
      { id: 'thumb.solid_handling', label: 'Sauberes Handling in Turbulenz', phase: 'climb' },
      { id: 'thumb.precise_landing', label: 'Präzise Landung / Volte', phase: 'landing' },
      { id: 'thumb.beautiful_moment', label: 'Schöner Moment', phase: 'cross_country' },
      { id: 'thumb.good_group_flight', label: 'Gruppenflug harmoniert', phase: 'cross_country' },
    ],
  },
  index: {
    selection: 'multi',
    categories: [
      { id: 'index.weather_insight', label: 'Wetter-Erkenntnis', phase: 'preparation' },
      { id: 'index.terrain_knowledge', label: 'Geländekunde / Auslöser', phase: 'climb' },
      { id: 'index.tactics', label: 'Taktische Erkenntnis', phase: 'cross_country' },
      { id: 'index.thermal_technique', label: 'Thermiktechnik', phase: 'climb' },
      { id: 'index.glide_speed', label: 'Gleit- und Sollfahrt', phase: 'cross_country' },
      { id: 'index.equipment_behaviour', label: 'Materialverhalten', phase: 'preparation' },
      { id: 'index.personal_limits', label: 'Eigene Grenzen erkannt', phase: 'cross_country' },
      { id: 'index.observed_others', label: 'Beobachtung an anderen Piloten', phase: 'climb' },
      { id: 'index.airspace_rules', label: 'Luftraum / Regeln / Absprachen', phase: 'preparation' },
    ],
  },
  middle: {
    selection: 'multi',
    categories: [
      { id: 'middle.launch_error', label: 'Startfehler', phase: 'launch' },
      { id: 'middle.line_knot', label: 'Knoten / Hänger in den Leinen', phase: 'launch' },
      { id: 'middle.collapse', label: 'Klapper unerwartet', phase: 'climb' },
      { id: 'middle.lost_thermal', label: 'Bart verloren / nicht zentriert', phase: 'climb' },
      { id: 'middle.missed_connection', label: 'Anschluss verpasst / zu tief', phase: 'cross_country' },
      { id: 'middle.bad_glide_decision', label: 'Falsche Abflugentscheidung', phase: 'cross_country' },
      { id: 'middle.imprecise_steering', label: 'Unpräzises Steuern', phase: 'climb' },
      { id: 'middle.off_field_landing', label: 'Außenlandung / Landeplatz verfehlt', phase: 'landing' },
      { id: 'middle.stress_moment', label: 'Stresssituation / Angstmoment', phase: 'cross_country' },
      { id: 'middle.equipment_issue', label: 'Materialproblem', phase: 'preparation' },
      { id: 'middle.traffic_conflict', label: 'Zu nah an anderen / Vorflugregel', phase: 'climb' },
      { id: 'middle.bad_timing', label: 'Zeitfenster verpasst', phase: 'preparation' },
    ],
  },
  ring: {
    selection: 'single',
    categories: [
      { id: 'ring.key_takeaway', label: 'Merksatz für den nächsten Flug', phase: 'debrief' },
      { id: 'ring.confirmed_limit', label: 'Bestätigte Regel / persönliches Limit', phase: 'debrief' },
      { id: 'ring.skill_to_practice', label: 'Technik zum Üben', phase: 'debrief' },
      { id: 'ring.new_routine', label: 'Neue Routine / Checkliste-Ergänzung', phase: 'debrief' },
      { id: 'ring.site_note', label: 'Fluggebiets-Notiz', phase: 'debrief' },
      { id: 'ring.lasting_impression', label: 'Bleibender Eindruck', phase: 'debrief' },
      { id: 'ring.confidence_shift', label: 'Vertrauensgewinn / -verlust', phase: 'debrief' },
    ],
  },
  little: {
    selection: 'multi',
    categories: [
      { id: 'pinky.weak_briefing', label: 'Wetterbriefing zu oberflächlich', phase: 'preparation' },
      { id: 'pinky.rushed_check', label: 'Check zu hastig', phase: 'launch' },
      { id: 'pinky.hydration_food', label: 'Zu wenig getrunken / gegessen', phase: 'cross_country' },
      { id: 'pinky.clothing', label: 'Falsch angezogen', phase: 'preparation' },
      { id: 'pinky.no_plan_b', label: 'Kein Plan B / Außenlandefelder', phase: 'preparation' },
      { id: 'pinky.no_goal_set', label: 'Kein Ziel vor dem Start definiert', phase: 'preparation' },
      { id: 'pinky.no_enjoyment', label: 'Genuss zu kurz gekommen', phase: 'cross_country' },
      { id: 'pinky.stopped_early', label: 'Zu früh abgebrochen', phase: 'cross_country' },
      { id: 'pinky.no_tracklog', label: 'Kein Tracklog / Auswertung offen', phase: 'debrief' },
      { id: 'pinky.missing_group_briefing', label: 'Absprache in der Gruppe fehlte', phase: 'cross_country' },
    ],
  },
};

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
