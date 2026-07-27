import { FINGER_CATEGORIES, FINGER_FIELDS } from '../constants';
import type { DebriefEntry, FingerKey } from '../types';

export type FingerFilter = FingerKey | 'all';

export type CategoryOption = {
  id: string;
  label: string;
  phase: string;
  finger: FingerKey;
  fingerTitle: string;
};

type PhaseKey = 'preparation' | 'launch' | 'climb' | 'cross_country' | 'landing';

export type StatisticsSnapshot = {
  totalEntries: number;
  matchedEntries: number;
  scopedHitCount: number;
  topPhaseLabel: string;
  topCategoryLabel: string;
  spiderPoints: Array<{
    key: string;
    label: string;
    phase: string;
    phaseLabel: string;
    finger: FingerKey;
    fingerTitle: string;
    count: number;
    ratio: number;
  }>;
  monthSeries: Array<{
    label: string;
    count: number;
  }>;
  phaseSeries: Array<{
    key: PhaseKey;
    label: string;
    count: number;
  }>;
  topCategories: Array<{
    id: string;
    label: string;
    fingerTitle: string;
    count: number;
  }>;
};

const PHASE_LABELS: Record<PhaseKey, string> = {
  preparation: 'Vorbereitung',
  launch: 'Start',
  climb: 'Steigen',
  cross_country: 'Strecke',
  landing: 'Landung',
};

const PHASE_ORDER: PhaseKey[] = [
  'preparation',
  'launch',
  'climb',
  'cross_country',
  'landing',
];

const ALL_FINGERS = FINGER_FIELDS.map((field) => field.key);
const MISSING_DATE_KEY = '9999-99';
const FALLBACK_LABEL = 'Noch offen';

const CATEGORY_OPTIONS: CategoryOption[] = FINGER_FIELDS.flatMap((field) =>
  FINGER_CATEGORIES[field.key].categories.map((category) => ({
    ...category,
    finger: field.key,
    fingerTitle: field.title,
  })),
);

const CATEGORY_BY_ID = new Map(CATEGORY_OPTIONS.map((option) => [option.id, option]));

const getScopeFingers = (fingerFilter: FingerFilter): FingerKey[] =>
  fingerFilter === 'all' ? ALL_FINGERS : [fingerFilter];

const toMonthKey = (flightDate: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(flightDate);
  if (!match) {
    return { key: MISSING_DATE_KEY, label: 'Ohne Datum' };
  }

  const [, year, month, day] = match;
  const parsedDate = new Date(`${year}-${month}-${day}T12:00:00Z`);
  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.getUTCFullYear() !== Number(year) ||
    parsedDate.getUTCMonth() + 1 !== Number(month) ||
    parsedDate.getUTCDate() !== Number(day)
  ) {
    return { key: MISSING_DATE_KEY, label: 'Ohne Datum' };
  }

  return {
    key: `${year}-${month}`,
    label: `${month}.${year.slice(2)}`,
  };
};

export const getCategoryOptions = (fingerFilter: FingerFilter): CategoryOption[] =>
  CATEGORY_OPTIONS.filter((option) => fingerFilter === 'all' || option.finger === fingerFilter);

/**
 * Builds a filtered statistics snapshot from existing debrief entries.
 * `fingerFilter` limits the category scope, while `selectedCategoryIds` optionally narrows that
 * scope down to explicit category matches. `matchedEntries` counts flights that satisfy the
 * explicit category filter, and `scopedHitCount` counts the category assignments that remain
 * inside the active scope.
 */
export const computeStatistics = (
  entries: DebriefEntry[],
  fingerFilter: FingerFilter,
  selectedCategoryIds: string[],
): StatisticsSnapshot => {
  const scopeFingers = getScopeFingers(fingerFilter);
  const selectedIds = new Set(selectedCategoryIds);
  const hasExplicitCategoryFilter = selectedIds.size > 0;
  const matchedEntries = entries.filter(
    (entry) =>
      !hasExplicitCategoryFilter ||
      scopeFingers.some((finger) =>
        (entry.categories?.[finger] ?? []).some((categoryId) => selectedIds.has(categoryId)),
      ),
  );

  const scopedHits = matchedEntries.flatMap((entry) =>
    scopeFingers.flatMap((finger) =>
      (entry.categories?.[finger] ?? [])
        .filter((categoryId) => !hasExplicitCategoryFilter || selectedIds.has(categoryId))
        .map((categoryId) => ({
          categoryId,
          month: toMonthKey(entry.meta.flightDate),
        })),
    ),
  );

  const monthCounts = new Map<string, { label: string; count: number }>();
  for (const hit of scopedHits) {
    const current = monthCounts.get(hit.month.key);
    monthCounts.set(hit.month.key, {
      label: hit.month.label,
      count: (current?.count ?? 0) + 1,
    });
  }

  const phaseCounts = new Map<PhaseKey, number>();
  const categoryCounts = new Map<string, number>();
  for (const hit of scopedHits) {
    const category = CATEGORY_BY_ID.get(hit.categoryId);
    if (!category) {
      continue;
    }

    phaseCounts.set(
      category.phase as PhaseKey,
      (phaseCounts.get(category.phase as PhaseKey) ?? 0) + 1,
    );
    categoryCounts.set(category.id, (categoryCounts.get(category.id) ?? 0) + 1);
  }

  const topCategory = [...categoryCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .at(0);

  const topPhase = [...phaseCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .at(0);

  const spiderCategories = CATEGORY_OPTIONS.filter(
    (option) =>
      scopeFingers.includes(option.finger) &&
      (!hasExplicitCategoryFilter || selectedIds.has(option.id)),
  );
  const spiderMaxCount = Math.max(
    ...spiderCategories.map((option) => categoryCounts.get(option.id) ?? 0),
    1,
  );
  const spiderPoints = spiderCategories.map((option) => {
    const count = categoryCounts.get(option.id) ?? 0;
    return {
      key: option.id,
      label: option.label,
      phase: option.phase,
      phaseLabel: PHASE_LABELS[option.phase as PhaseKey] ?? option.phase,
      finger: option.finger,
      fingerTitle: option.fingerTitle,
      count,
      ratio: count / spiderMaxCount,
    };
  }).filter((point) => point.count > 0);

  return {
    totalEntries: entries.length,
    matchedEntries: matchedEntries.length,
    scopedHitCount: scopedHits.length,
    topPhaseLabel: topPhase ? PHASE_LABELS[topPhase[0]] : FALLBACK_LABEL,
    topCategoryLabel: topCategory
      ? (CATEGORY_BY_ID.get(topCategory[0])?.label ?? FALLBACK_LABEL)
      : FALLBACK_LABEL,
    spiderPoints,
    monthSeries: [...monthCounts.entries()]
      .sort((left, right) => left[0].localeCompare(right[0]))
      .slice(-6)
      .map(([, value]) => ({ label: value.label, count: value.count })),
    phaseSeries: PHASE_ORDER.map((phase) => ({
      key: phase,
      label: PHASE_LABELS[phase],
      count: phaseCounts.get(phase) ?? 0,
    })),
    topCategories: [...categoryCounts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5)
      .map(([categoryId, count]) => {
        const category = CATEGORY_BY_ID.get(categoryId);

        return {
          id: categoryId,
          label: category?.label ?? categoryId,
          fingerTitle: category?.fingerTitle ?? '',
          count,
        };
      }),
  };
};
