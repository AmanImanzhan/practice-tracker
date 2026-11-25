import React, { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { spacing, radius, fontSize } from '../theme/tokens';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useSessionsStore } from '../store/sessionsStore';
import { repositories } from '../repositories';
import { ensureSessionForDate } from '../lib/sessionHelpers';
import { formatClock, toISODate, todayParts } from '../lib/date';
import { cancelTimerAlert, scheduleTimerAlert } from '../lib/notifications';
import { NumberStepper } from '../components/NumberStepper';

type Mode = 'stopwatch' | 'timer';
type RunState = 'idle' | 'running' | 'paused';

const TICK_MS = 250;

export function TimerScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const { profile } = useProfile();
  const upsertSession = useSessionsStore((s) => s.upsertSession);

  const [mode, setMode] = useState<Mode>('stopwatch');

  // Stopwatch
  const [swElapsedMs, setSwElapsedMs] = useState(0);
  const [swRunState, setSwRunState] = useState<RunState>('idle');
  const swStartRef = useRef<number | null>(null);
  const swBaseRef = useRef(0);
  const swSavedMsRef = useRef(0);

  // Timer (countdown)
  const [duration, setDuration] = useState({ h: 0, m: 0, s: 0 });
  const [timerRemainingMs, setTimerRemainingMs] = useState(0);
  const [timerRunState, setTimerRunState] = useState<RunState>('idle');
  const timerStartRef = useRef<number | null>(null);
  const timerBaseRemainingRef = useRef(0);
  const timerTotalMsRef = useRef(0);

  useEffect(() => {
    if (swRunState !== 'running' && timerRunState !== 'running') return;
    const id = setInterval(() => {
      if (swRunState === 'running' && swStartRef.current !== null) {
        setSwElapsedMs(swBaseRef.current + (Date.now() - swStartRef.current));
      }
      if (timerRunState === 'running' && timerStartRef.current !== null) {
        const remaining = Math.max(0, timerBaseRemainingRef.current - (Date.now() - timerStartRef.current));
        setTimerRemainingMs(remaining);
        if (remaining <= 0) {
          timerStartRef.current = null;
          setTimerRunState('idle');
          const totalMs = timerTotalMsRef.current;
          timerTotalMsRef.current = 0;
          setDuration({ h: 0, m: 0, s: 0 });
          saveTiming(Math.round(totalMs / 60000));
        }
      }
    }, TICK_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swRunState, timerRunState]);

  async function saveTiming(minutes: number) {
    if (!user || minutes <= 0) return;
    try {
      const today = todayParts();
      const dateISO = toISODate(today.year, today.month, today.day);
      const target = await ensureSessionForDate(user.id, dateISO);
      await repositories.timings.add(target.id, minutes, null);
      const fresh = await repositories.sessions.getById(target.id);
      if (fresh) upsertSession(fresh);
    } catch (error) {
      Alert.alert('Could not save session', error instanceof Error ? error.message : 'Please try again.');
    }
  }

  // --- Stopwatch handlers ---
  function handleStopwatchStart() {
    swBaseRef.current = 0;
    swSavedMsRef.current = 0;
    swStartRef.current = Date.now();
    setSwElapsedMs(0);
    setSwRunState('running');
  }

  function handleStopwatchStop() {
    setSwRunState('paused');
    swStartRef.current = null;
    const deltaMinutes = Math.round((swElapsedMs - swSavedMsRef.current) / 60000);
    swSavedMsRef.current = swElapsedMs;
    saveTiming(deltaMinutes);
  }

  function handleStopwatchResume() {
    swBaseRef.current = swElapsedMs;
    swStartRef.current = Date.now();
    setSwRunState('running');
  }

  function handleStopwatchReset() {
    setSwRunState('idle');
    setSwElapsedMs(0);
    swStartRef.current = null;
    swBaseRef.current = 0;
    swSavedMsRef.current = 0;
  }

  // --- Timer (countdown) handlers ---
  const timerAlertsEnabled = !!(profile?.pushNotificationsEnabled && profile?.sessionTimerAlertsEnabled);

  async function handleTimerStart() {
    const totalMs = (duration.h * 3600 + duration.m * 60 + duration.s) * 1000;
    if (totalMs <= 0) return;
    timerTotalMsRef.current = totalMs;
    timerBaseRemainingRef.current = totalMs;
    timerStartRef.current = Date.now();
    setTimerRemainingMs(totalMs);
    setTimerRunState('running');
    if (timerAlertsEnabled) {
      // scheduleTimerAlert never rejects (see lib/notifications.ts), but awaited
      // inside a try/catch regardless rather than left as a dangling promise.
      try {
        await scheduleTimerAlert(totalMs);
      } catch (error) {
        console.warn('Could not schedule the session timer alert:', error);
      }
    }
  }

  async function handleTimerPause() {
    if (timerStartRef.current !== null) {
      const remaining = Math.max(0, timerBaseRemainingRef.current - (Date.now() - timerStartRef.current));
      timerBaseRemainingRef.current = remaining;
      setTimerRemainingMs(remaining);
    }
    timerStartRef.current = null;
    setTimerRunState('paused');
    try {
      await cancelTimerAlert();
    } catch (error) {
      console.warn('Could not cancel the session timer alert:', error);
    }
  }

  async function handleTimerResume() {
    timerStartRef.current = Date.now();
    setTimerRunState('running');
    if (timerAlertsEnabled) {
      try {
        await scheduleTimerAlert(timerBaseRemainingRef.current);
      } catch (error) {
        console.warn('Could not schedule the session timer alert:', error);
      }
    }
  }

  async function handleTimerDelete() {
    setTimerRunState('idle');
    setTimerRemainingMs(0);
    timerStartRef.current = null;
    timerBaseRemainingRef.current = 0;
    timerTotalMsRef.current = 0;
    setDuration({ h: 0, m: 0, s: 0 });
    try {
      await cancelTimerAlert();
    } catch (error) {
      console.warn('Could not cancel the session timer alert:', error);
    }
  }

  const isStopwatch = mode === 'stopwatch';
  const displayMs = isStopwatch
    ? swElapsedMs
    : timerRunState === 'idle'
      ? (duration.h * 3600 + duration.m * 60 + duration.s) * 1000
      : timerRemainingMs;
  const runState = isStopwatch ? swRunState : timerRunState;
  const circleActive = runState !== 'idle';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={styles.toggleRow}>
        <View style={[styles.toggle, { backgroundColor: theme.colors.border }]}>
          {(['stopwatch', 'timer'] as Mode[]).map((m) => (
            <Pressable key={m} onPress={() => setMode(m)} style={styles.toggleOption}>
              <View
                style={[
                  styles.toggleFill,
                  mode === m && { backgroundColor: theme.colors.surface, shadowOpacity: 0.1 },
                ]}
              >
                <Text
                  style={[
                    styles.toggleText,
                    { color: mode === m ? theme.colors.primary : theme.colors.textSecondary },
                  ]}
                >
                  {m === 'stopwatch' ? 'Stopwatch' : 'Timer'}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.circleWrapper}>
        <View
          style={[
            styles.circle,
            {
              backgroundColor: theme.colors.surface,
              borderColor: circleActive ? theme.colors.primary : theme.colors.border,
            },
          ]}
        >
          <Text style={[styles.clockText, { color: theme.colors.textPrimary }]}>{formatClock(displayMs)}</Text>
          <Text style={[styles.clockCaption, { color: theme.colors.textSecondary }]}>CURRENT SESSION</Text>
        </View>
      </View>

      {!isStopwatch && timerRunState === 'idle' && (
        <View style={styles.durationSection}>
          <Text style={[styles.durationLabel, { color: theme.colors.textSecondary }]}>SET DURATION</Text>
          <View style={styles.durationRow}>
            <NumberStepper label="HOURS" value={duration.h} max={23} onChange={(h) => setDuration((d) => ({ ...d, h }))} />
            <NumberStepper label="MINUTES" value={duration.m} max={59} onChange={(m) => setDuration((d) => ({ ...d, m }))} />
            <NumberStepper label="SECONDS" value={duration.s} max={59} onChange={(s) => setDuration((d) => ({ ...d, s }))} />
          </View>
        </View>
      )}

      <View style={styles.buttonRow}>
        {isStopwatch ? (
          <>
            {swRunState === 'idle' && (
              <PrimaryButton label="Start" color={theme.colors.primary} onPress={handleStopwatchStart} full />
            )}
            {swRunState === 'running' && (
              <>
                {/* No lap list in the design to show results in — disabled rather than a
                    silent no-op button, until that UI is designed. */}
                <OutlineButton label="Lap" onPress={() => {}} disabled />
                <PrimaryButton label="Stop" color={theme.colors.danger} onPress={handleStopwatchStop} />
              </>
            )}
            {swRunState === 'paused' && (
              <>
                <OutlineButton label="Reset" onPress={handleStopwatchReset} />
                <PrimaryButton label="Resume" color={theme.colors.primary} onPress={handleStopwatchResume} />
              </>
            )}
          </>
        ) : (
          <>
            {timerRunState === 'idle' && (
              <PrimaryButton
                label="Start"
                color={theme.colors.primary}
                onPress={handleTimerStart}
                full
                disabled={duration.h === 0 && duration.m === 0 && duration.s === 0}
              />
            )}
            {timerRunState === 'running' && (
              <>
                <OutlineButton label="Delete" onPress={handleTimerDelete} />
                <PrimaryButton label="Pause" color={theme.colors.danger} onPress={handleTimerPause} />
              </>
            )}
            {timerRunState === 'paused' && (
              <>
                <OutlineButton label="Delete" onPress={handleTimerDelete} />
                <PrimaryButton label="Resume" color={theme.colors.primary} onPress={handleTimerResume} />
              </>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

function PrimaryButton({
  label,
  color,
  onPress,
  full,
  disabled,
}: {
  label: string;
  color: string;
  onPress: () => void;
  full?: boolean;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        full && styles.buttonFull,
        { backgroundColor: color, opacity: disabled ? 0.5 : 1 },
      ]}
    >
      <Text style={[styles.buttonText, { color: theme.colors.onPrimary }]}>{label}</Text>
    </Pressable>
  );
}

function OutlineButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
        disabled && { opacity: 0.4 },
      ]}
    >
      <Text style={[styles.buttonText, { color: theme.colors.textPrimary }]}>{label}</Text>
    </Pressable>
  );
}

const CIRCLE_SIZE = 260;

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  toggleRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  toggle: {
    flexDirection: 'row',
    borderRadius: radius.pill,
    padding: 4,
    width: '100%',
  },
  toggleOption: {
    flex: 1,
  },
  toggleFill: {
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  circleWrapper: {
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockText: {
    fontSize: 40,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  clockCaption: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: spacing.xs,
  },
  durationSection: {
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  durationLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  durationRow: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: 'auto',
    marginBottom: spacing.xl,
  },
  button: {
    flex: 1,
    height: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonFull: {
    flex: 1,
  },
  buttonText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
});
