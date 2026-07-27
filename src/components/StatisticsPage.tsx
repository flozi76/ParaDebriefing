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
  return (
    <View style={styles.spiderCard}>
      <View style={styles.spiderChart}>
        {[1, 2, 3].map((step) => (
          <View
            key={step}
            style={[
              styles.spiderRing,
              {
                width: step * 56,
                height: step * 56,
                borderRadius: step * 28,
              },
            ]}
          />
        ))}
        {points.map((point, index) => {
          const angle = -Math.PI / 2 + index * ((Math.PI * 2) / points.length);
          const axisPosition = getSpiderAxisPosition(angle);
          const dotLeft = SPIDER_CENTER + Math.cos(angle) * SPIDER_RADIUS * point.ratio - 7;
          const dotTop = SPIDER_CENTER + Math.sin(angle) * SPIDER_RADIUS * point.ratio - 7;
          const pointColor = FINGER_SPIDER_COLORS[point.finger];

          return (
            <View key={point.key}>
              <View
                style={[
                  styles.spiderAxis,
                  {
                    backgroundColor: pointColor,
                    left: axisPosition.left,
                    top: axisPosition.top,
                    transform: [{ rotate: `${angle}rad` }],
                  },
                ]}
              />
              <View
                style={[
                  styles.spiderPoint,
                  {
                    backgroundColor: pointColor,
                    left: dotLeft,
                    top: dotTop,
                  },
                ]}
              />
            </View>
          );
        })}
        <View style={styles.spiderCenterBadge}>
          <Text style={styles.spiderCenterBadgeText}>Profil</Text>
        </View>
      </View>
      <View style={styles.spiderLegend}>
        {points.map((point) => (
          <View key={point.key} style={styles.spiderLegendRow}>
            <View style={styles.spiderLegendLabelGroup}>
              <View
                style={[
                  styles.spiderLegendDot,
                  { backgroundColor: FINGER_SPIDER_COLORS[point.finger] },
                ]}
              />
              <View style={styles.spiderLegendTextWrap}>
                <Text style={styles.spiderLegendLabel}>{point.label}</Text>
                <Text style={styles.spiderLegendMeta}>{point.fingerTitle}</Text>
              </View>
            </View>
            <Text style={styles.spiderLegendValue}>{point.count}</Text>
          </View>
        ))}
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
