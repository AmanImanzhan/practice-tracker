import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetTextInput,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing, fontSize } from '../theme/tokens';
import { formatDuration, formatLongDate, toISODate } from '../lib/date';
import { ensureSessionForDate } from '../lib/sessionHelpers';
import { repositories } from '../repositories';
import type { PracticeSession } from '../types/domain';

interface DayDetailModalProps {
  visible: boolean;
  userId: string;
  year: number;
  month: number;
  day: number;
  session: PracticeSession | null;
  onClose: () => void;
  onSessionChange: (session: PracticeSession) => void;
  onSessionDeleted: (sessionId: string) => void;
}

type TimingUnit = 'h' | 'min';

const SNAP_POINTS = ['85%'];

export function DayDetailModal({
  visible,
  userId,
  year,
  month,
  day,
  session,
  onClose,
  onSessionChange,
  onSessionDeleted,
}: DayDetailModalProps) {
  const theme = useTheme();
  const sheetRef = useRef<BottomSheet>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const [timingValue, setTimingValue] = useState('');
  const [timingUnit, setTimingUnit] = useState<TimingUnit>('h');

  const [pieceTitle, setPieceTitle] = useState('');

  const [notesDraft, setNotesDraft] = useState(session?.notes ?? '');

  // Reset all ephemeral UI/draft state whenever a different day's modal opens.
  useEffect(() => {
    if (visible) {
      setIsEditing(false);
      setTimingValue('');
      setTimingUnit('h');
      setPieceTitle('');
      setNotesDraft(session?.notes ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, session?.id]);

  const totalMinutes = session ? session.timings.reduce((sum, t) => sum + t.durationMinutes, 0) : 0;
  const dateISO = toISODate(year, month, day);

  async function ensureSession(): Promise<PracticeSession> {
    if (session) return session;
    const created = await ensureSessionForDate(userId, dateISO);
    onSessionChange(created);
    return created;
  }

  async function refreshSession(sessionId: string) {
    const fresh = await repositories.sessions.getById(sessionId);
    if (fresh) onSessionChange(fresh);
  }

  function parseTimingMinutes(): number {
    const parsed = parseFloat(timingValue.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return Math.round(timingUnit === 'h' ? parsed * 60 : parsed);
  }

  const canAdd = timingValue.trim().length > 0 || pieceTitle.trim().length > 0;

  // One shared button for both inputs: adds whichever of timing/piece is actually
  // filled in (or both), and only clears the field(s) it used.
  async function handleAdd() {
    const minutes = parseTimingMinutes();
    const title = pieceTitle.trim();
    const hasTiming = minutes > 0;
    const hasPiece = title.length > 0;
    if (!hasTiming && !hasPiece) return;

    setIsBusy(true);
    try {
      const target = await ensureSession();
      if (hasTiming) await repositories.timings.add(target.id, minutes, null);
      if (hasPiece) await repositories.repertoire.add(target.id, title);
      await refreshSession(target.id);
      if (hasTiming) setTimingValue('');
      if (hasPiece) setPieceTitle('');
    } catch (error) {
      Alert.alert('Could not add entry', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRemoveTiming(timingId: string) {
    if (!session) return;
    setIsBusy(true);
    try {
      await repositories.timings.remove(timingId);
      await refreshSession(session.id);
    } catch (error) {
      Alert.alert('Could not remove timing', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRemovePiece(repertoireItemId: string) {
    if (!session) return;
    setIsBusy(true);
    try {
      await repositories.repertoire.remove(repertoireItemId);
      await refreshSession(session.id);
    } catch (error) {
      Alert.alert('Could not remove piece', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleNotesBlur() {
    const trimmed = notesDraft.trim();
    const current = session?.notes ?? '';
    if (trimmed === current) return;

    setIsBusy(true);
    try {
      const target = await ensureSession();
      const updated = await repositories.sessions.update(target.id, { notes: trimmed || null });
      onSessionChange(updated);
    } catch (error) {
      Alert.alert('Could not save notes', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsBusy(false);
    }
  }

  function handleDeleteLog() {
    if (!session) return;
    Alert.alert('Delete this log?', 'Practice timing, repertoire and notes for this day will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setIsBusy(true);
          try {
            await repositories.sessions.delete(session.id);
            onSessionDeleted(session.id);
            onClose();
          } catch (error) {
            Alert.alert('Could not delete log', error instanceof Error ? error.message : 'Please try again.');
          } finally {
            setIsBusy(false);
          }
        },
      },
    ]);
  }

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.4} pressBehavior="close" />
    ),
    []
  );

  const backgroundStyle = useMemo(() => ({ backgroundColor: theme.colors.background }), [theme.colors.background]);
  const handleIndicatorStyle = useMemo(() => ({ backgroundColor: theme.colors.border }), [theme.colors.border]);

  if (!visible) return null;

  return (
    <BottomSheet
      ref={sheetRef}
      index={0}
      snapPoints={SNAP_POINTS}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={backgroundStyle}
      handleIndicatorStyle={handleIndicatorStyle}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
    >
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{formatLongDate(year, month, day)}</Text>
          {session && (
            <View style={[styles.dayBadge, { backgroundColor: `${theme.colors.primary}14` }]}>
              <Text style={[styles.dayBadgeText, { color: theme.colors.primary }]}>Day {session.dayNumber}</Text>
            </View>
          )}
        </View>
        <Pressable onPress={() => sheetRef.current?.close()} hitSlop={8}>
          <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
        </Pressable>
      </View>
      {session && (
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary, paddingHorizontal: spacing.lg }]}>
          {formatDuration(totalMinutes)} total practice
        </Text>
      )}

      <BottomSheetScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>PRACTICE TIMING</Text>
        <View style={styles.chipsRow}>
          {session?.timings.map((timing) => (
            <View
              key={timing.id}
              style={[styles.chip, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
            >
              <Text style={[styles.chipText, { color: theme.colors.textPrimary }]}>
                {formatDuration(timing.durationMinutes)}
              </Text>
              {isEditing && (
                <Pressable onPress={() => handleRemoveTiming(timing.id)} hitSlop={6} disabled={isBusy}>
                  <Ionicons name="close-circle" size={16} color={theme.colors.danger} />
                </Pressable>
              )}
            </View>
          ))}
        </View>

        <View style={styles.addTimingRow}>
          <BottomSheetTextInput
            value={timingValue}
            onChangeText={setTimingValue}
            placeholder="1.5"
            placeholderTextColor={theme.colors.placeholder}
            keyboardType="decimal-pad"
            style={[
              styles.timingInput,
              { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
            ]}
          />
          <View style={[styles.unitToggle, { borderColor: theme.colors.border }]}>
            {(['h', 'min'] as TimingUnit[]).map((unit) => (
              <Pressable
                key={unit}
                onPress={() => setTimingUnit(unit)}
                style={[styles.unitOption, timingUnit === unit && { backgroundColor: theme.colors.primary }]}
              >
                <Text
                  style={[
                    styles.unitOptionText,
                    { color: timingUnit === unit ? theme.colors.onPrimary : theme.colors.textPrimary },
                  ]}
                >
                  {unit}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Text style={[styles.sectionLabel, styles.sectionSpacing, { color: theme.colors.textSecondary }]}>
          REPERTOIRE COVERED
        </Text>
        {session && session.repertoire.length > 0 && (
          <View style={styles.repertoireList}>
            {session.repertoire.map((item) => (
              <View key={item.id} style={styles.repertoireRow}>
                <View style={[styles.bullet, { backgroundColor: theme.colors.primary }]} />
                <Text style={[styles.repertoireText, { color: theme.colors.textPrimary }]}>{item.title}</Text>
                {isEditing && (
                  <Pressable onPress={() => handleRemovePiece(item.id)} hitSlop={6} disabled={isBusy}>
                    <Ionicons name="close-circle" size={16} color={theme.colors.danger} />
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={styles.addPieceRow}>
          <BottomSheetTextInput
            value={pieceTitle}
            onChangeText={setPieceTitle}
            placeholder="Orchestral repertoire"
            placeholderTextColor={theme.colors.placeholder}
            style={[
              styles.pieceInput,
              { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
            ]}
          />
        </View>

        <Pressable
          onPress={handleAdd}
          disabled={isBusy || !canAdd}
          style={[
            styles.combinedAddButton,
            { backgroundColor: theme.colors.primary, opacity: isBusy || !canAdd ? 0.4 : 1 },
          ]}
        >
          <Text style={[styles.combinedAddButtonText, { color: theme.colors.onPrimary }]}>Add</Text>
        </Pressable>

        <Text style={[styles.sectionLabel, styles.sectionSpacing, { color: theme.colors.textSecondary }]}>
          DAY NOTES
        </Text>
        <BottomSheetTextInput
          value={notesDraft}
          onChangeText={setNotesDraft}
          onBlur={handleNotesBlur}
          placeholder="Add notes about today's practice..."
          placeholderTextColor={theme.colors.placeholder}
          multiline
          style={[
            styles.notesInput,
            { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
          ]}
        />

        {session && (
          <View style={styles.footerRow}>
            <Pressable
              onPress={handleDeleteLog}
              disabled={isBusy}
              style={[styles.footerButton, styles.deleteButton, { borderColor: theme.colors.border }]}
            >
              <Ionicons name="trash-outline" size={16} color={theme.colors.textPrimary} />
              <Text style={[styles.footerButtonText, { color: theme.colors.textPrimary }]}>Delete Log</Text>
            </Pressable>
            <Pressable
              onPress={() => setIsEditing((prev) => !prev)}
              style={[styles.footerButton, { backgroundColor: theme.colors.primary }]}
            >
              <Ionicons name={isEditing ? 'checkmark-outline' : 'create-outline'} size={16} color={theme.colors.onPrimary} />
              <Text style={[styles.footerButtonText, { color: theme.colors.onPrimary }]}>
                {isEditing ? 'Done' : 'Edit Details'}
              </Text>
            </Pressable>
          </View>
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '800',
  },
  dayBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  dayBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  body: {
    marginTop: spacing.md,
  },
  bodyContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
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
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  addTimingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  timingInput: {
    width: 64,
    height: 40,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    fontSize: fontSize.md,
  },
  unitToggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  unitOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  unitOptionText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  combinedAddButton: {
    marginTop: spacing.md,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  combinedAddButtonText: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  repertoireList: {
    gap: spacing.xs,
  },
  repertoireRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  repertoireText: {
    fontSize: fontSize.md,
    flexShrink: 1,
  },
  addPieceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  pieceInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    fontSize: fontSize.md,
  },
  notesInput: {
    minHeight: 110,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: fontSize.md,
    textAlignVertical: 'top',
  },
  footerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  footerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
  },
  deleteButton: {
    borderWidth: 1,
  },
  footerButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
});
