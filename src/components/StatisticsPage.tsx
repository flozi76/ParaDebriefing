import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { FINGER_FIELDS } from '../constants';
import { styles } from '../styles/styles';
import { computeStatistics, getCategoryOptions, type FingerFilter } from '../service/statisticsService';
import type { DebriefEntry } from '../types';

interface StatisticsPageProps {
  entries: DebriefEntry[];
  onCreateEntry: () => void;
}

const SPIDER_SIZE = 240;
const SPIDER_RADIUS = SPIDER_SIZE * 0.325;
const SPIDER_CENTER = SPIDER_SIZE / 2;
const SPIDER_AXIS_RADIUS = SPIDER_RADIUS / 2;
const MIN_MONTH_BAR_HEIGHT = 24;
const MONTH_BAR_HEIGHT_RANGE = 96;
const FINGER_SPIDER_COLORS = {
  thumb: '#4cae5c',
  index: '#d89b2b',
  middle: '#cb4f5c',
  ring: '#6d6ed9',
  little: '#2f98b0',
} as const;
const PHASE_SPIDER_COLORS = {
  preparation: '#56758e',
  launch: '#2e8b57',
  climb: '#2f7ec6',
  cross_country: '#9166cc',
  landing: '#c9772a',
} as const;
const SPIDER_SCALE_STEPS = [0.25, 0.5, 0.75, 1];
const SPIDER_META_SEPARATOR = ' · ';
const deduplicatePairs = (pairs: Array<[string, string]>) => [...new Map(pairs).entries()];

const getSpiderAxisPosition = (angle: number) => ({
  left: SPIDER_CENTER + Math.cos(angle) * SPIDER_AXIS_RADIUS - SPIDER_AXIS_RADIUS,
  top: SPIDER_CENTER + Math.sin(angle) * SPIDER_AXIS_RADIUS - 1,
});

const getMonthBarHeight = (count: number, maxCount: number) =>
  MIN_MONTH_BAR_HEIGHT + (count / maxCount) * MONTH_BAR_HEIGHT_RANGE;

function SpiderChart({
  points,
}: {
  points: ReturnType<typeof computeStatistics>['spiderPoints'];
}) {
  const [selectedPointKey, setSelectedPointKey] = useState<string | null>(null);
  const maxSpiderCount = Math.max(...points.map((point) => point.count), 1);
  const selectedPoint = points.find((point) => point.key === selectedPointKey) ?? null;
  const phaseGroups = deduplicatePairs(points.map((point) => [point.phase, point.phaseLabel]));
  const fingerGroups = deduplicatePairs(points.map((point) => [point.finger, point.fingerTitle]));

  return (
    <View style={styles.spiderCard}>
      <View style={styles.spiderChart}>
        {SPIDER_SCALE_STEPS.map((step) => {
          const size = SPIDER_RADIUS * 2 * step;
          return (
            <View
              key={step}
              style={[
                styles.spiderScaleRing,
                {
                  width: size,
                  height: size,
                  left: SPIDER_CENTER - size / 2,
                  top: SPIDER_CENTER - size / 2,
                },
              ]}
            />
          );
        })}
        {SPIDER_SCALE_STEPS.map((step) => (
          <Text
            key={`scale-${step}`}
            style={[
              styles.spiderScaleLabel,
              { top: SPIDER_CENTER - SPIDER_RADIUS * step - 8 },
            ]}
          >
            {Math.round(maxSpiderCount * step)}
          </Text>
        ))}
        {points.map((point, index) => {
          const angle = -Math.PI / 2 + index * ((Math.PI * 2) / points.length);
          const axisPosition = getSpiderAxisPosition(angle);
          const dotLeft = SPIDER_CENTER + Math.cos(angle) * SPIDER_RADIUS * point.ratio - 7;
          const dotTop = SPIDER_CENTER + Math.sin(angle) * SPIDER_RADIUS * point.ratio - 7;
          const pointColor = FINGER_SPIDER_COLORS[point.finger];

          const nextIndex = (index + 1) % points.length;
          const nextPoint = points[nextIndex];
          const nextAngle = -Math.PI / 2 + nextIndex * ((Math.PI * 2) / points.length);
          const x1 = SPIDER_CENTER + Math.cos(angle) * SPIDER_RADIUS * point.ratio;
          const y1 = SPIDER_CENTER + Math.sin(angle) * SPIDER_RADIUS * point.ratio;
          const x2 = SPIDER_CENTER + Math.cos(nextAngle) * SPIDER_RADIUS * nextPoint.ratio;
          const y2 = SPIDER_CENTER + Math.sin(nextAngle) * SPIDER_RADIUS * nextPoint.ratio;
          const lineAngle = Math.atan2(y2 - y1, x2 - x1);
          const lineLength = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
          const phaseDotLeft = SPIDER_CENTER + Math.cos(angle) * (SPIDER_RADIUS + 12) - 4;
          const phaseDotTop = SPIDER_CENTER + Math.sin(angle) * (SPIDER_RADIUS + 12) - 4;
          const fingerDotLeft = SPIDER_CENTER + Math.cos(angle) * (SPIDER_RADIUS + 24) - 4;
          const fingerDotTop = SPIDER_CENTER + Math.sin(angle) * (SPIDER_RADIUS + 24) - 4;
          const isSelected = selectedPointKey === point.key;
          const isDimmed = selectedPointKey !== null && selectedPointKey !== point.key;

          return (
            <View key={point.key}>
              <View
                style={[
                  styles.spiderAxis,
                  {
                    backgroundColor: isSelected ? '#12304a' : pointColor,
                    left: axisPosition.left,
                    top: axisPosition.top,
                    transform: [{ rotate: `${angle}rad` }],
                  },
                ]}
              />
              {points.length > 1 && (
                <View
                  style={[
                    styles.spiderLine,
                    {
                      width: lineLength,
                      left: (x1 + x2) / 2 - lineLength / 2,
                      top: (y1 + y2) / 2 - 1,
                      opacity: isDimmed ? 0.4 : 1,
                      transform: [{ rotate: `${lineAngle}rad` }],
                    },
                  ]}
                />
              )}
              <View
                style={[
                  styles.spiderOuterDot,
                  {
                    backgroundColor:
                      PHASE_SPIDER_COLORS[point.phase as keyof typeof PHASE_SPIDER_COLORS] ?? '#56758e',
                    left: phaseDotLeft,
                    top: phaseDotTop,
                  },
                ]}
              />
              <View
                style={[
                  styles.spiderOuterDot,
                  {
                    backgroundColor: pointColor,
                    left: fingerDotLeft,
                    top: fingerDotTop,
                  },
                ]}
              />
              <Pressable
                accessibilityRole="button"
                onPress={() => setSelectedPointKey((current) => (current === point.key ? null : point.key))}
                style={[
                  styles.spiderPoint,
                  {
                    backgroundColor: pointColor,
                    left: dotLeft,
                    top: dotTop,
                  },
                  isSelected && styles.spiderPointSelected,
                ]}
              />
            </View>
          );
        })}
      </View>
      <View style={styles.spiderGroupLegend}>
        <Text style={styles.spiderGroupLegendTitle}>Badge-Gruppen (Phase)</Text>
        <View style={styles.spiderGroupRow}>
          {phaseGroups.map(([phase, phaseLabel]) => (
            <View key={phase} style={styles.spiderGroupChip}>
              <View
                style={[
                  styles.spiderGroupColor,
                  {
                    backgroundColor: PHASE_SPIDER_COLORS[phase as keyof typeof PHASE_SPIDER_COLORS] ?? '#56758e',
                  },
                ]}
              />
              <Text style={styles.spiderGroupText}>{phaseLabel}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.spiderGroupLegendTitle}>Finger-Gruppen (außen)</Text>
        <View style={styles.spiderGroupRow}>
          {fingerGroups.map(([finger, fingerTitle]) => (
            <View key={finger} style={styles.spiderGroupChip}>
              <View
                style={[
                  styles.spiderGroupColor,
                  {
                    backgroundColor: FINGER_SPIDER_COLORS[finger as keyof typeof FINGER_SPIDER_COLORS],
                  },
                ]}
              />
              <Text style={styles.spiderGroupText}>{fingerTitle}</Text>
            </View>
          ))}
        </View>
      </View>
      {selectedPoint ? (
        <Text style={styles.spiderSelection}>
          Ausgewählt: {selectedPoint.label} ({selectedPoint.count})
        </Text>
      ) : (
        <Text style={styles.spiderSelectionHint}>Tippe auf einen Punkt, um das Badge hervorzuheben.</Text>
      )}
      <View style={styles.spiderLegend}>
        {points.map((point) => {
          const isSelected = selectedPointKey === point.key;

          return (
            <Pressable
              key={point.key}
              accessibilityRole="button"
              onPress={() => setSelectedPointKey((current) => (current === point.key ? null : point.key))}
              style={[styles.spiderLegendRow, isSelected && styles.spiderLegendRowSelected]}
            >
              <View style={styles.spiderLegendLabelGroup}>
                <View
                  style={[
                    styles.spiderLegendDot,
                    { backgroundColor: FINGER_SPIDER_COLORS[point.finger] },
                  ]}
                />
                <View style={styles.spiderLegendTextWrap}>
                  <Text style={styles.spiderLegendLabel}>{point.label}</Text>
                  <Text style={styles.spiderLegendMeta}>
                    {[point.phaseLabel, point.fingerTitle]
                      .filter((value) => value.trim().length > 0)
                      .join(SPIDER_META_SEPARATOR)}
                  </Text>
                </View>
              </View>
              <Text style={styles.spiderLegendValue}>{point.count}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function StatisticsPage({ entries, onCreateEntry }: StatisticsPageProps) {
  const [fingerFilter, setFingerFilter] = useState<FingerFilter>('all');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  const categoryOptions = useMemo(() => getCategoryOptions(fingerFilter), [fingerFilter]);
  const stats = useMemo(
    () => computeStatistics(entries, fingerFilter, selectedCategoryIds),
    [entries, fingerFilter, selectedCategoryIds],
  );

  const maxMonthCount = Math.max(...stats.monthSeries.map((item) => item.count), 1);
  const maxPhaseCount = Math.max(...stats.phaseSeries.map((item) => item.count), 1);
  const selectedCategorySet = new Set(selectedCategoryIds);
  const fingerFilterLabel =
    fingerFilter === 'all'
      ? 'Alle Finger'
      : FINGER_FIELDS.find((field) => field.key === fingerFilter)?.title ?? 'Alle Finger';
  const categorySelectionLabel =
    selectedCategoryIds.length === 0
      ? 'alle Kategorien'
      : `${selectedCategoryIds.length} ${selectedCategoryIds.length === 1 ? 'Kategorie' : 'Kategorien'}`;

  const handleFingerFilterChange = (nextFilter: FingerFilter) => {
    setFingerFilter(nextFilter);
    const validIds = new Set(getCategoryOptions(nextFilter).map((option) => option.id));
    setSelectedCategoryIds((current) => current.filter((categoryId) => validIds.has(categoryId)));
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategoryIds((current) =>
      current.includes(categoryId)
        ? current.filter((existingId) => existingId !== categoryId)
        : [...current, categoryId],
    );
  };

  if (entries.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Statistik</Text>
        <Text style={styles.emptyState}>
          Sobald die ersten Debriefings gespeichert sind, entsteht hier ein erster Statistik-Vorschlag mit Radarbild, Zeitverlauf und Phasenblick.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={onCreateEntry}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.secondaryButtonText}>Erstes Debriefing anlegen</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.statisticsPage}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Statistik</Text>
        <Text style={styles.statisticsIntro}>
          Erster Vorschlag: Filtere nach Finger und Kategorien. Danach zeigen Radar-Profil, Zeitverlauf und Phasenmix, welche Muster sich über deine Flüge abzeichnen.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.statisticsFilterHeader}>
          <Text style={styles.filterTitle}>Filter</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setIsFilterExpanded((current) => !current)}
            style={({ pressed }) => [pressed && styles.buttonPressed]}
          >
            <Text style={styles.resetFilterText}>
              {isFilterExpanded ? 'Ausblenden' : 'Anzeigen'}
            </Text>
          </Pressable>
        </View>
        <Text style={styles.statisticsCaption}>
          Aktiv: {fingerFilterLabel} · {categorySelectionLabel}
        </Text>

        {isFilterExpanded ? (
          <>
            <Text style={styles.filterTitle}>Finger-Fokus</Text>
            <View style={styles.filterChipWrap}>
              <Pressable
                accessibilityRole="button"
                onPress={() => handleFingerFilterChange('all')}
                style={({ pressed }) => [
                  styles.filterChip,
                  fingerFilter === 'all' && styles.filterChipSelected,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    fingerFilter === 'all' && styles.filterChipTextSelected,
                  ]}
                >
                  Alle
                </Text>
              </Pressable>
              {FINGER_FIELDS.map((field) => (
                <Pressable
                  key={field.key}
                  accessibilityRole="button"
                  onPress={() => handleFingerFilterChange(field.key)}
                  style={({ pressed }) => [
                    styles.filterChip,
                    fingerFilter === field.key && styles.filterChipSelected,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      fingerFilter === field.key && styles.filterChipTextSelected,
                    ]}
                  >
                    {field.title}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.statisticsFilterHeader}>
              <Text style={styles.filterTitle}>Kategorien</Text>
              {selectedCategoryIds.length > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setSelectedCategoryIds([])}
                  style={({ pressed }) => [pressed && styles.buttonPressed]}
                >
                  <Text style={styles.resetFilterText}>Zurücksetzen</Text>
                </Pressable>
              ) : null}
            </View>
            <View style={styles.filterChipWrap}>
              {categoryOptions.map((option) => (
                <Pressable
                  key={option.id}
                  accessibilityRole="button"
                  onPress={() => toggleCategory(option.id)}
                  style={({ pressed }) => [
                    styles.filterChip,
                    selectedCategorySet.has(option.id) && styles.filterChipSelected,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedCategorySet.has(option.id) && styles.filterChipTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}
      </View>

      {stats.matchedEntries === 0 ? (
        <View style={styles.card}>
          <Text style={styles.emptyState}>
            Für diese Kategorie-Auswahl gibt es noch keine Treffer. Wähle andere Kategorien oder setze den Filter zurück.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Treffer-Flüge</Text>
              <Text style={styles.summaryValue}>
                {stats.matchedEntries} / {stats.totalEntries}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Kategorie-Treffer</Text>
              <Text style={styles.summaryValue}>{stats.scopedHitCount}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Stärkste Phase</Text>
              <Text style={styles.summaryValueSmall}>{stats.topPhaseLabel}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.statisticsCardHeader}>
              <Text style={styles.sectionTitle}>Radar-Profil</Text>
              <Text style={styles.statisticsCaption}>Wie oft tauchen die ausgewählten Badges auf?</Text>
            </View>
            <SpiderChart points={stats.spiderPoints} />
          </View>

          <View style={styles.card}>
            <View style={styles.statisticsCardHeader}>
              <Text style={styles.sectionTitle}>Zeitverlauf</Text>
              <Text style={styles.statisticsCaption}>Kategorie-Treffer in den letzten Monaten</Text>
            </View>
            {stats.monthSeries.length === 0 ? (
              <Text style={styles.emptyState}>Für den aktuellen Filter gibt es noch keine Kategorie-Treffer über die Zeit.</Text>
            ) : (
              <View style={styles.monthChart}>
                {stats.monthSeries.map((item) => (
                  <View key={item.label} style={styles.monthBarGroup}>
                    <Text style={styles.monthValue}>{item.count}</Text>
                    <View
                      style={[
                        styles.monthBar,
                        {
                          height: getMonthBarHeight(item.count, maxMonthCount),
                        },
                      ]}
                    />
                    <Text style={styles.monthLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.card}>
            <View style={styles.statisticsCardHeader}>
              <Text style={styles.sectionTitle}>Phasenmix</Text>
              <Text style={styles.statisticsCaption}>Wo häufen sich die markierten Beobachtungen?</Text>
            </View>
            <View style={styles.phaseChart}>
              {stats.phaseSeries.map((item) => (
                <View key={item.key} style={styles.phaseRow}>
                  <Text style={styles.phaseLabel}>{item.label}</Text>
                  <View style={styles.phaseTrack}>
                    <View
                      style={[
                        styles.phaseFill,
                        { width: `${(item.count / maxPhaseCount) * 100}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.phaseValue}>{item.count}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.statisticsCardHeader}>
              <Text style={styles.sectionTitle}>Frische Highlights</Text>
              <Text style={styles.statisticsCaption}>Die häufigsten Kategorien im aktuellen Filter</Text>
            </View>
            {stats.topCategories.length === 0 ? (
              <Text style={styles.emptyState}>Noch keine Kategorien im aktuellen Filter markiert.</Text>
            ) : (
              <View style={styles.topCategoryList}>
                {stats.topCategories.map((item) => (
                  <View key={item.id} style={styles.topCategoryRow}>
                    <View style={styles.topCategoryTextGroup}>
                      <Text style={styles.topCategoryLabel}>{item.label}</Text>
                      <Text style={styles.topCategoryMeta}>{item.fingerTitle}</Text>
                    </View>
                    <Text style={styles.topCategoryCount}>{item.count}</Text>
                  </View>
                ))}
              </View>
            )}
            <Text style={styles.statisticsFooter}>Häufigste Kategorie aktuell: {stats.topCategoryLabel}</Text>
          </View>
        </>
      )}
    </View>
  );
}
