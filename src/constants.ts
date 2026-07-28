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
      { id: 'thumb.core_centered', label: 'Schlauch sauber zentriert', phase: 'climb' },
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
      { id: 'index.weather_timing', label: 'Wetterfenster / Timing genauer prüfen', phase: 'preparation' },
      { id: 'index.thermals_turbulence', label: 'Thermik und Turbulenzen im Blick behalten', phase: 'climb' },
      { id: 'index.personal_limits', label: 'Persönliche Limits respektieren', phase: 'cross_country' },
      { id: 'index.airspace_rules', label: 'Luftraum und Absprachen beachten', phase: 'preparation' },
      { id: 'index.launch_conditions', label: 'Startbedingungen nicht überstürzen', phase: 'launch' },
      { id: 'index.off_field_planning', label: 'Außenlandefelder frühzeitig planen', phase: 'cross_country' },
      { id: 'index.group_awareness', label: 'Gruppe im Blick behalten', phase: 'cross_country' },
      { id: 'index.equipment_check', label: 'Materialcheck / Ausrüstung', phase: 'preparation' },
      { id: 'index.energy_nutrition', label: 'Energiehaushalt / Verpflegung', phase: 'cross_country' },
      { id: 'index.turn_right_more', label: 'Mehr rechts drehen', phase: 'climb' },
      { id: 'index.turn_left_more', label: 'Mehr links drehen', phase: 'climb' },
      { id: 'index.more_patience', label: 'Mehr Geduld üben', phase: 'climb' },
      { id: 'index.stay_with_group', label: 'Gruppe nicht verlassen', phase: 'cross_country' },
    ],
  },
  middle: {
    selection: 'multi',
    categories: [
      { id: 'middle.social_pressure', label: 'Sozialer Druck / Gruppenzwang', phase: 'preparation' },
      { id: 'middle.risky_weather_flight', label: 'Risikoflüge bei schlechtem Wetter', phase: 'preparation' },
      { id: 'middle.ignore_warnings', label: 'Ignorieren von Warnsignalen', phase: 'cross_country' },
      { id: 'middle.late_abort', label: 'Zu späte Abbruchentscheidung', phase: 'cross_country' },
      { id: 'middle.ego_decisions', label: 'Ego-getriebene Entscheidungen', phase: 'cross_country' },
      { id: 'middle.hectic_stress', label: 'Hektisches Handeln unter Stress', phase: 'climb' },
      { id: 'middle.incomplete_prep', label: 'Unvollständige Vorbereitung', phase: 'preparation' },
      { id: 'middle.flying_fatigued', label: 'Übermüdet fliegen', phase: 'preparation' },
      { id: 'middle.one_turn_direction_only', label: 'Nur in einer Drehrichtung einkreisen', phase: 'climb' },
    ],
  },
  ring: {
    selection: 'multi',
    categories: [
      { id: 'ring.thorough_weather_prep', label: 'Gründliche Wettervorbereitung', phase: 'preparation' },
      { id: 'ring.calm_decisions', label: 'Ruhige Entscheidungen', phase: 'cross_country' },
      { id: 'ring.clear_goal', label: 'Klares Ziel vor dem Flug', phase: 'preparation' },
      { id: 'ring.land_early_when_unsure', label: 'Frühzeitig landen bei Unsicherheit', phase: 'landing' },
      { id: 'ring.clean_preflight_check', label: 'Sauberer Check vor dem Start', phase: 'launch' },
      { id: 'ring.group_coordination', label: 'Gute Gruppenkoordination', phase: 'cross_country' },
      { id: 'ring.accept_own_limits', label: 'Persönliche Grenzen akzeptieren', phase: 'cross_country' },
    ],
  },
  little: {
    selection: 'multi',
    categories: [
      { id: 'little.weather_insight', label: 'Wetter-Erkenntnis', phase: 'preparation' },
      { id: 'little.terrain_knowledge', label: 'Geländekunde / Auslöser', phase: 'climb' },
      { id: 'little.tactical_insight', label: 'Taktische Erkenntnis', phase: 'cross_country' },
      { id: 'little.thermal_technique', label: 'Thermiktechnik verbessert', phase: 'climb' },
      { id: 'little.personal_limits', label: 'Eigene Grenzen erkannt', phase: 'cross_country' },
      { id: 'little.equipment_behaviour', label: 'Materialverhalten erfahren', phase: 'preparation' },
      { id: 'little.mental_strength', label: 'Mentale Stärke trainiert', phase: 'cross_country' },
      { id: 'little.navigation', label: 'Navigation verbessert', phase: 'cross_country' },
      { id: 'little.airspace_knowledge', label: 'Luftraumwissen erweitert', phase: 'preparation' },
      { id: 'little.good_right_turn', label: 'Gut rechts gedreht', phase: 'climb' },
      { id: 'little.good_left_turn', label: 'Gut links gedreht', phase: 'climb' },
      { id: 'little.turbulence_balanced', label: 'Turbulenzen gut ausgeglichen', phase: 'climb' },
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
    prompt: 'Worauf muss ich in Zukunft aufpassen?',
    activeParts: ['thumb', 'index'],
    placeholder:
      'Risiken, Situationen oder Gewohnheiten, die ich im Blick behalten möchte.',
  },
  {
    key: 'middle',
    title: 'Mittelfinger',
    prompt: 'Worauf möchte ich in Zukunft verzichten?',
    activeParts: ['thumb', 'index', 'middle'],
    placeholder:
      'Verhaltensweisen, Entscheidungen oder Einflüsse, auf die ich künftig besser verzichte.',
  },
  {
    key: 'ring',
    title: 'Ringfinger',
    prompt: 'Worauf möchte ich in Zukunft festhalten?',
    activeParts: ['thumb', 'index', 'middle', 'ring'],
    placeholder:
      'Gute Gewohnheiten, Routinen oder Entscheidungen, die ich weiter beibehalten möchte.',
  },
  {
    key: 'little',
    title: 'Kleiner Finger',
    prompt: 'Was habe ich gelernt?',
    activeParts: ['thumb', 'index', 'middle', 'ring', 'little'],
    placeholder:
      'Neue Erkenntnisse, Beobachtungen zum Wetter oder taktische Entscheidungen.',
  },
] as const;

export const STORAGE_KEY = 'paradebriefing.entries';
export const DEFAULT_LOCATION = 'Aktueller Standort';
export const MIN_OVERVIEW_ROW_WIDTH = 220;
// Alps region – central paragliding area
export const FALLBACK_COORDS = { lat: 47.5, lon: 11.5 };
