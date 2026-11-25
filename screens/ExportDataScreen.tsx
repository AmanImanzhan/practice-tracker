import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '../types/navigation';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { spacing, fontSize, radius } from '../theme/tokens';
import { formatDuration, formatShortDate, formatShortMonthYear, formatTotalHours, toISODate, todayParts } from '../lib/date';
import { totalMinutesForSessions } from '../lib/practiceStats';
import { repositories } from '../repositories';
import type { PracticeSession } from '../types/domain';

type Props = NativeStackScreenProps<SettingsStackParamList, 'ExportData'>;

type Format = 'pdf' | 'csv';
type RangeKey = 'last30' | 'last3months' | 'lastyear' | 'alltime';

const FORMATS: { key: Format; label: string }[] = [
  { key: 'pdf', label: 'PDF' },
  { key: 'csv', label: 'CSV' },
];

const RANGES: { key: RangeKey; label: string }[] = [
  { key: 'last30', label: 'Last 30 days' },
  { key: 'last3months', label: 'Last 3 months' },
  { key: 'lastyear', label: 'Last year' },
  { key: 'alltime', label: 'All time' },
];

function todayISO(): string {
  const t = todayParts();
  return toISODate(t.year, t.month, t.day);
}

function rangeToDates(range: RangeKey): { startDate: string; endDate: string } {
  const now = new Date();
  if (range === 'alltime') {
    // Genuinely unbounded — not capped at "today", so a session dated ahead of the
    // device's clock (easy to end up with while testing via the day modal, which
    // lets you log any date) still shows up under "All time".
    const farFuture = new Date(now);
    farFuture.setFullYear(farFuture.getFullYear() + 100);
    return {
      startDate: '1970-01-01',
      endDate: toISODate(farFuture.getFullYear(), farFuture.getMonth() + 1, farFuture.getDate()),
    };
  }
  const endDate = todayISO();
  const start = new Date(now);
  if (range === 'last30') start.setDate(start.getDate() - 30);
  if (range === 'last3months') start.setMonth(start.getMonth() - 3);
  if (range === 'lastyear') start.setFullYear(start.getFullYear() - 1);
  return { startDate: toISODate(start.getFullYear(), start.getMonth() + 1, start.getDate()), endDate };
}

function sessionMinutes(session: PracticeSession): number {
  return session.timings.reduce((sum, t) => sum + t.durationMinutes, 0);
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildCsvContent(sessions: PracticeSession[]): string {
  const header = ['date', 'day_number', 'total_minutes', 'repertoire', 'notes'];
  const rows = sessions.map((s) => [
    s.date,
    String(s.dayNumber),
    String(sessionMinutes(s)),
    s.repertoire.map((r) => r.title).join('; '),
    s.notes ?? '',
  ]);
  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\r\n');
  // Without a UTF-8 BOM, Excel on Windows guesses the file is in the system's local
  // codepage and mangles any non-Latin text (Cyrillic, accents, etc.) — Numbers,
  // Google Sheets, and every other reader already assume UTF-8 and ignore the BOM.
  const BOM = '\uFEFF';
  return BOM + csv;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildPdfHtml(sessions: PracticeSession[], rangeLabel: string, dateRangeLabel: string, totalMinutes: number): string {
  const rows = sessions
    .map((s) => {
      const [year, month, day] = s.date.split('-').map(Number);
      const minutes = sessionMinutes(s);
      const repertoire = s.repertoire.map((r) => r.title).join(', ') || '—';
      const notes = s.notes?.trim() || '—';
      return `
        <tr>
          <td>${formatShortDate(year, month, day)}</td>
          <td>${minutes > 0 ? formatDuration(minutes) : '—'}</td>
          <td>${escapeHtml(repertoire)}</td>
          <td>${escapeHtml(notes)}</td>
        </tr>`;
    })
    .join('');

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Helvetica, Arial, sans-serif; color: #111111; padding: 32px; }
          h1 { font-size: 22px; margin: 0 0 4px; }
          .meta { color: #555555; font-size: 12px; margin-bottom: 16px; }
          .totals { margin-bottom: 20px; font-size: 13px; }
          .totals div { margin-bottom: 4px; }
          .totals strong { display: inline-block; min-width: 150px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #cccccc; padding: 6px 8px; text-align: left; vertical-align: top; }
          th { background: #f2f2f2; }
        </style>
      </head>
      <body>
        <h1>Practice Tracker</h1>
        <div class="meta">Period: ${escapeHtml(rangeLabel)} (${escapeHtml(dateRangeLabel)})</div>
        <div class="totals">
          <div><strong>Total sessions:</strong> ${sessions.length}</div>
          <div><strong>Total practice time:</strong> ${formatTotalHours(totalMinutes)}</div>
        </div>
        <table>
          <thead>
            <tr><th>Date</th><th>Practice Time</th><th>Repertoire</th><th>Notes</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>`;
}

export function ExportDataScreen({ navigation }: Props) {
  const theme = useTheme();
  const { user } = useAuth();
  const [format, setFormat] = useState<Format>('pdf');
  const [range, setRange] = useState<RangeKey>('alltime'); // matches the design's default selection
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const { startDate, endDate } = rangeToDates(range);
    setIsLoadingPreview(true);
    repositories.sessions
      .getByDateRange(user.id, startDate, endDate)
      .then(setSessions)
      .catch((error) => {
        console.error('Failed to load export preview:', error);
        Alert.alert('Could not load preview', error instanceof Error ? error.message : 'Please try again.');
      })
      .finally(() => setIsLoadingPreview(false));
  }, [user, range]);

  const totalMinutes = totalMinutesForSessions(sessions);
  const { startDate, endDate } = rangeToDates(range);
  const isEmpty = !isLoadingPreview && sessions.length === 0;
  // Sessions come back sorted ascending by date — show the span the actual data
  // covers within the selected range, not the range's own (sometimes arbitrary,
  // e.g. 1970 for "All time") boundaries.
  const dateRangeLabel =
    sessions.length > 0
      ? `${formatShortMonthYear(sessions[0].date)} – ${formatShortMonthYear(sessions[sessions.length - 1].date)}`
      : '—';

  async function handleExport() {
    if (!user || isExporting) return;
    if (sessions.length === 0) {
      Alert.alert('Nothing to export', 'There are no practice sessions in the selected date range.');
      return;
    }

    setIsExporting(true);
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Sharing is not available', 'Your device does not support the share sheet.');
        return;
      }

      if (format === 'csv') {
        const file = new File(Paths.cache, `practice-tracker-export-${startDate}-to-${endDate}.csv`);
        if (file.exists) file.delete();
        file.create();
        file.write(buildCsvContent(sessions));
        await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Export Practice Data' });
        return;
      }

      // PDF generation needs expo-print, a native module that isn't guaranteed to be
      // linked into every build yet (it's new, added after the last EAS build). A
      // static top-level import would throw the moment this screen's module loads —
      // crashing the whole app on launch, not just this button — so it's loaded lazily,
      // right here, inside this try/catch instead.
      let printModule: typeof import('expo-print') | undefined;
      try {
        printModule = await import('expo-print');
      } catch (error) {
        // Expected on any build made before expo-print was added — not a bug, so this
        // stays a console.warn rather than console.error (which would pop LogBox's red
        // screen for something that isn't actually broken).
        console.warn('expo-print could not be loaded (native module likely not linked into this build yet):', error);
      }

      // Metro's dynamic import can resolve without throwing even when the native module
      // underneath failed to load, leaving exports like printToFileAsync undefined —
      // catching the import alone isn't enough; checking for a real function is.
      if (typeof printModule?.printToFileAsync !== 'function') {
        console.warn('expo-print.printToFileAsync is unavailable — treating PDF export as not ready yet.');
        Alert.alert('PDF Export Unavailable', 'PDF export will be available after the next app update. Please use CSV for now.');
        return;
      }

      const rangeLabel = RANGES.find((r) => r.key === range)?.label ?? '';
      const html = buildPdfHtml(sessions, rangeLabel, dateRangeLabel, totalMinutes);
      const { uri } = await printModule.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Export Practice Data' });
    } catch (error) {
      console.error('Export Practice Data failed:', error);
      Alert.alert('Could not export data', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsExporting(false);
    }
  }

  const exportDisabled = isExporting || isEmpty;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={12}>
        <Ionicons name="chevron-back" size={26} color={theme.colors.textPrimary} />
      </Pressable>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Export Practice Data</Text>
        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
          Export your complete practice history and statistics to keep your records safe or import them elsewhere.
        </Text>

        <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>EXPORT FORMAT</Text>
        <View style={styles.pillRow}>
          {FORMATS.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setFormat(f.key)}
              style={[
                styles.pill,
                { borderColor: format === f.key ? theme.colors.primary : theme.colors.border },
              ]}
            >
              <Text style={[styles.pillText, { color: format === f.key ? theme.colors.primary : theme.colors.textPrimary }]}>
                {f.label}
              </Text>
              {format === f.key && <Ionicons name="checkmark" size={14} color={theme.colors.primary} />}
            </Pressable>
          ))}
        </View>

        <Text style={[styles.sectionLabel, styles.sectionSpacing, { color: theme.colors.textSecondary }]}>
          DATE RANGE
        </Text>
        <View style={styles.rangeGrid}>
          {RANGES.map((r) => (
            <Pressable
              key={r.key}
              onPress={() => setRange(r.key)}
              style={[
                styles.rangePill,
                { borderColor: range === r.key ? theme.colors.primary : theme.colors.border },
              ]}
            >
              <Text style={[styles.pillText, { color: range === r.key ? theme.colors.primary : theme.colors.textPrimary }]}>
                {r.label}
              </Text>
              {range === r.key && <Ionicons name="checkmark" size={14} color={theme.colors.primary} />}
            </Pressable>
          ))}
        </View>

        <View style={[styles.previewCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.previewHeader}>
            <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary, marginBottom: 0 }]}>
              PREVIEW EXPORT INFO
            </Text>
            <Ionicons name="information-circle-outline" size={16} color={theme.colors.textSecondary} />
          </View>
          <PreviewRow label="Total sessions" value={String(sessions.length)} theme={theme} isLoading={isLoadingPreview} />
          <PreviewRow label="Total hours" value={`${(totalMinutes / 60).toFixed(1)}h`} theme={theme} isLoading={isLoadingPreview} />
          <PreviewRow label="Date range" value={dateRangeLabel} theme={theme} isLoading={isLoadingPreview} last />
        </View>

        {isEmpty && (
          <Text style={[styles.emptyNote, { color: theme.colors.textSecondary }]}>
            No practice sessions in this period.
          </Text>
        )}

        <Pressable
          onPress={handleExport}
          disabled={exportDisabled}
          style={[styles.exportButton, { backgroundColor: theme.colors.primary, opacity: exportDisabled ? 0.5 : 1 }]}
        >
          <Text style={[styles.exportButtonText, { color: theme.colors.onPrimary }]}>Export Data</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function PreviewRow({
  label,
  value,
  theme,
  isLoading,
  last,
}: {
  label: string;
  value: string;
  theme: ReturnType<typeof useTheme>;
  isLoading: boolean;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.previewRow,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
      ]}
    >
      <Text style={[styles.previewLabel, { color: theme.colors.textPrimary }]}>{label}</Text>
      <Text style={[styles.previewValue, { color: theme.colors.textPrimary }]}>{isLoading ? '…' : value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  backButton: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: spacing.sm,
  },
  sectionSpacing: {
    marginTop: spacing.lg,
  },
  pillRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  pillText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  rangeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  rangePill: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  previewCard: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  previewLabel: {
    fontSize: fontSize.md,
  },
  previewValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  emptyNote: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  exportButton: {
    height: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  exportButtonText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
});
