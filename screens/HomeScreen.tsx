import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { spacing, fontSize, radius } from '../theme/tokens';
import { useSessions } from '../hooks/useSessions';
import { useProfile } from '../hooks/useProfile';
import { useAuth } from '../hooks/useAuth';
import { MonthSelector } from '../components/MonthSelector';
import { StatsCard } from '../components/StatsCard';
import { DayTableHeader } from '../components/DayTableHeader';
import { DayRow } from '../components/DayRow';
import { PaywallBanner } from '../components/PaywallBanner';
import { LockedMonthCard } from '../components/LockedMonthCard';
import { DayDetailModal } from '../components/DayDetailModal';
import {
  daysInMonth,
  formatMonthDay,
  formatMonthLabel,
  formatTotalHours,
  isCurrentMonth,
  isFutureDate,
  toISODate,
} from '../lib/date';
import { countPracticeDaysInMonth, totalMinutesForSessions } from '../lib/practiceStats';
import { PAYWALL_ENABLED } from '../lib/features';
import { repositories } from '../repositories';
import { USER_CANCELLED_CODE } from '../repositories/supabase/SupabaseAuthRepository';
import type { PracticeSession } from '../types/domain';

export function HomeScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const {
    sessions,
    year,
    month,
    selectedDate,
    isLoading,
    error,
    goToMonth,
    selectDate,
    upsertSession,
    removeSession,
  } = useSessions();
  const { profile, setProfile } = useProfile();
  const [modalDay, setModalDay] = useState<number | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [priceLabel, setPriceLabel] = useState<string | null>(null);

  useEffect(() => {
    // Gated: this is the app's only unconditional call into expo-iap (fetches the
    // store's product list), and 1.0 ships with no active paid-apps agreement — it
    // must not hit StoreKit at all while the paywall is off.
    if (!PAYWALL_ENABLED) return;
    repositories.purchases.getFullAccessPriceLabel().then(setPriceLabel);
  }, []);

  async function handleUnlock() {
    if (!user || isPurchasing) return;
    setIsPurchasing(true);
    try {
      await repositories.purchases.purchaseFullAccess();
      const updated = await repositories.users.getProfile(user.id);
      if (updated) setProfile(updated);
    } catch (error) {
      if ((error as { code?: string })?.code === USER_CANCELLED_CODE) return;
      Alert.alert('Could not complete purchase', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsPurchasing(false);
    }
  }

  // Free users only get the current calendar month — past months are shown a locked
  // card in place of their data instead (the restriction is UI-only: nothing server-side
  // is ever deleted or hidden, and the month's sessions still get fetched above).
  // Off entirely in 1.0 (see lib/features.ts) — every month is open to everyone.
  const isMonthLocked = PAYWALL_ENABLED && !!profile && !profile.unlocked && !isCurrentMonth(year, month);

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, PracticeSession>();
    sessions.forEach((s) => map.set(s.date, s));
    return map;
  }, [sessions]);

  const totalDays = daysInMonth(year, month);
  const days = useMemo(() => {
    // Future days never have (or can have) a session, and shouldn't be tappable to
    // create one — hide them from the table entirely rather than show a dead row.
    const list: number[] = [];
    for (let d = totalDays; d >= 1; d -= 1) {
      if (!isFutureDate(toISODate(year, month, d))) list.push(d);
    }
    return list;
  }, [totalDays, year, month]);

  const daysPracticed = useMemo(() => countPracticeDaysInMonth(sessions), [sessions]);
  const totalMinutes = useMemo(() => totalMinutesForSessions(sessions), [sessions]);

  const selectedDay = Number(selectedDate.split('-')[2]);
  const selectedSession = sessionsByDate.get(selectedDate) ?? null;
  const selectedIsFuture = isFutureDate(selectedDate);

  function openModalFor(day: number) {
    if (isMonthLocked) return;
    const iso = toISODate(year, month, day);
    if (isFutureDate(iso)) return;
    selectDate(iso);
    setModalDay(day);
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Practice Tracker</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Daily session registry</Text>
        </View>
        <MonthSelector year={year} month={month} onSelectMonth={goToMonth} />
      </View>

      {isMonthLocked ? (
        <LockedMonthCard
          monthLabel={formatMonthLabel(year, month)}
          onUnlock={handleUnlock}
          disabled={isPurchasing}
          priceLabel={priceLabel}
        />
      ) : (
        <>
          <View style={styles.statsWrapper}>
            <StatsCard daysPracticed={daysPracticed} totalTimeLabel={formatTotalHours(totalMinutes)} />
          </View>

          {error && (
            <Text style={[styles.error, { color: theme.colors.danger }]}>{error}</Text>
          )}

          <FlatList
            style={styles.flex}
            data={days}
            keyExtractor={(day) => String(day)}
            ListHeaderComponent={<DayTableHeader />}
            stickyHeaderIndices={[0]}
            renderItem={({ item: day }) => {
              const iso = toISODate(year, month, day);
              const session = sessionsByDate.get(iso) ?? null;
              return (
                <DayRow
                  year={year}
                  month={month}
                  day={day}
                  session={session}
                  isSelected={iso === selectedDate}
                  onPress={() => openModalFor(day)}
                />
              );
            }}
            ListEmptyComponent={
              isLoading ? <ActivityIndicator style={styles.loading} color={theme.colors.primary} /> : null
            }
          />

          <View style={styles.footer}>
            {PAYWALL_ENABLED && profile && !profile.unlocked && (
              <PaywallBanner onUnlock={handleUnlock} disabled={isPurchasing} priceLabel={priceLabel} />
            )}

            <View style={styles.selectedRow}>
              <Text style={[styles.selectedLabel, { color: theme.colors.textSecondary }]}>
                Selected: {formatMonthDay(month, selectedDay)}
                {selectedSession ? ` (Day ${selectedSession.dayNumber})` : ''}
              </Text>
              <Pressable
                onPress={() => openModalFor(selectedDay)}
                disabled={selectedIsFuture}
                style={[styles.addButton, { backgroundColor: theme.colors.primary, opacity: selectedIsFuture ? 0.4 : 1 }]}
              >
                <Ionicons name="add" size={18} color={theme.colors.onPrimary} />
                <Text style={[styles.addButtonText, { color: theme.colors.onPrimary }]}>Add Session</Text>
              </Pressable>
            </View>
          </View>
        </>
      )}

      {user && !isMonthLocked && (
        <DayDetailModal
          visible={modalDay !== null}
          userId={user.id}
          year={year}
          month={month}
          day={modalDay ?? selectedDay}
          session={modalDay !== null ? sessionsByDate.get(toISODate(year, month, modalDay)) ?? null : null}
          onClose={() => setModalDay(null)}
          onSessionChange={upsertSession}
          onSessionDeleted={removeSession}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: fontSize.md,
    marginTop: 2,
  },
  statsWrapper: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  error: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  loading: {
    marginTop: spacing.xl,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
  },
  selectedLabel: {
    fontSize: fontSize.sm,
    flexShrink: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  addButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
});
