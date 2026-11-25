// Safe wrapper around expo-notifications — the only file in the app allowed to import it.
// Every other screen/store goes through the functions below, never the raw library.
//
// Why: expo-notifications re-exports dozens of submodules (permissions, scheduler,
// handler, push token manager, ...), and several of them call requireNativeModule() at
// their own top level — same as expo-print and expo-store-review, but here a missing
// native module (ExpoPushTokenManager, confirmed on a build made before this dependency
// was added) makes the entire `await import('expo-notifications')` reject, not just
// leave a few exports undefined. Every exported function below is therefore wrapped
// end to end in its own try/catch, so NOTHING in this file can ever produce a rejected
// promise — a caller that forgets to await+catch (fire-and-forget from a Switch's
// onValueChange, a `.then()` with no `.catch()`, a bare `void someAsyncCall()`) still
// can't crash the app, because there is never a rejection for it to miss.
//
// No app.json config plugin is used for this feature on purpose: expo-notifications'
// plugin unconditionally adds an `aps-environment` entitlement (for real remote/APNs
// push), which this app doesn't use or want. Local scheduling, permissions, and sound
// all work via plain runtime calls with no Info.plist entry and no Apple Developer
// capability required — the native module links in via normal autolinking regardless
// of whether its config plugin is listed in app.json.

export type NotificationsModule = typeof import('expo-notifications');

const REQUIRED_EXPORTS = [
  'getPermissionsAsync',
  'requestPermissionsAsync',
  'scheduleNotificationAsync',
  'cancelScheduledNotificationAsync',
  'cancelAllScheduledNotificationsAsync',
  'setNotificationHandler',
] as const;

export const DAILY_REMINDER_ID = 'daily-practice-reminder';
export const TIMER_ALERT_ID = 'session-timer-alert';

export type PermissionStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable';

let cachedModule: NotificationsModule | null | undefined; // undefined = not attempted yet
let handlerConfigured = false;

/** Loads expo-notifications if it hasn't been already, and caches the result for the
 *  rest of the app session. Always resolves — never rejects — regardless of whether the
 *  native module is linked into this build. */
async function loadNotifications(): Promise<NotificationsModule | null> {
  if (cachedModule !== undefined) return cachedModule;

  try {
    const mod = await import('expo-notifications');
    // A broken native module doesn't necessarily make the whole dynamic import reject —
    // it can resolve with some exports undefined instead (confirmed with expo-print).
    // SchedulableTriggerInputTypes is a plain enum, not a function, so it needs its own
    // check alongside the function presence checks below.
    const missing = [
      ...REQUIRED_EXPORTS.filter((name) => typeof mod[name] !== 'function'),
      ...(typeof mod.SchedulableTriggerInputTypes !== 'object' || mod.SchedulableTriggerInputTypes === null
        ? ['SchedulableTriggerInputTypes']
        : []),
    ];
    if (missing.length > 0) {
      console.warn(
        `expo-notifications is missing expected exports (${missing.join(', ')}) — native module likely not linked into this build yet.`
      );
      cachedModule = null;
    } else {
      cachedModule = mod;
    }
  } catch (error) {
    console.warn('expo-notifications could not be loaded (native module likely not linked into this build yet):', error);
    cachedModule = null;
  }

  // Configured once, right after the first successful load — without this, a
  // notification that fires while the app is in the foreground shows nothing (iOS
  // default behavior is to suppress foreground alerts unless a handler says otherwise).
  // In its own try/catch: a module that passed the checks above but still somehow
  // throws when actually called must not take the rest of this function down with it.
  try {
    if (cachedModule && !handlerConfigured) {
      cachedModule.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
      handlerConfigured = true;
    }
  } catch (error) {
    console.warn('expo-notifications.setNotificationHandler failed:', error);
  }

  return cachedModule;
}

function toSimpleStatus(response: { granted: boolean; canAskAgain: boolean }): PermissionStatus {
  if (response.granted) return 'granted';
  return response.canAskAgain ? 'undetermined' : 'denied';
}

/** Checks the current system permission without prompting the user. */
export async function getPermissionStatusAsync(): Promise<PermissionStatus> {
  try {
    const mod = await loadNotifications();
    if (!mod) return 'unavailable';
    return toSimpleStatus(await mod.getPermissionsAsync());
  } catch (error) {
    console.warn('expo-notifications.getPermissionsAsync failed:', error);
    return 'unavailable';
  }
}

/** Shows the system permission prompt. Only call this in direct response to the user
 *  turning a notifications toggle on for the first time — never on app launch. */
export async function requestPermissionAsync(): Promise<PermissionStatus> {
  try {
    const mod = await loadNotifications();
    if (!mod) return 'unavailable';
    return toSimpleStatus(await mod.requestPermissionsAsync());
  } catch (error) {
    console.warn('expo-notifications.requestPermissionsAsync failed:', error);
    return 'unavailable';
  }
}

/** Schedules (replacing any previous one) the daily reminder at `time24` ('HH:MM'). */
export async function scheduleDailyReminder(time24: string): Promise<void> {
  try {
    const mod = await loadNotifications();
    if (!mod) return;
    const [hour, minute] = time24.split(':').map(Number);
    try {
      await mod.cancelScheduledNotificationAsync(DAILY_REMINDER_ID);
    } catch {
      // Nothing was scheduled yet — fine.
    }
    await mod.scheduleNotificationAsync({
      identifier: DAILY_REMINDER_ID,
      content: {
        title: 'Practice Tracker',
        body: 'Time to practice 🎻 Even 15 minutes keeps your streak going.',
        sound: 'default',
      },
      trigger: { type: mod.SchedulableTriggerInputTypes.DAILY, hour, minute },
    });
  } catch (error) {
    console.warn('Could not schedule the daily practice reminder:', error);
  }
}

export async function cancelDailyReminder(): Promise<void> {
  try {
    const mod = await loadNotifications();
    if (!mod) return;
    await mod.cancelScheduledNotificationAsync(DAILY_REMINDER_ID);
  } catch (error) {
    console.warn('Could not cancel the daily practice reminder:', error);
  }
}

/** Schedules a one-shot alert `remainingMs` from now, replacing any previous one. */
export async function scheduleTimerAlert(remainingMs: number): Promise<void> {
  try {
    const mod = await loadNotifications();
    if (!mod) return;
    const seconds = Math.max(1, Math.round(remainingMs / 1000));
    try {
      await mod.cancelScheduledNotificationAsync(TIMER_ALERT_ID);
    } catch {
      // Nothing was scheduled yet — fine.
    }
    await mod.scheduleNotificationAsync({
      identifier: TIMER_ALERT_ID,
      content: {
        title: "Time's Up!",
        body: 'Great session — your practice time is up.',
        sound: 'default',
      },
      trigger: { type: mod.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds },
    });
  } catch (error) {
    console.warn('Could not schedule the session timer alert:', error);
  }
}

export async function cancelTimerAlert(): Promise<void> {
  try {
    const mod = await loadNotifications();
    if (!mod) return;
    await mod.cancelScheduledNotificationAsync(TIMER_ALERT_ID);
  } catch (error) {
    console.warn('Could not cancel the session timer alert:', error);
  }
}

/** Cancels every scheduled local notification — used on sign-out and account deletion. */
export async function cancelAllScheduled(): Promise<void> {
  try {
    const mod = await loadNotifications();
    if (!mod) return;
    await mod.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.warn('Could not cancel scheduled notifications:', error);
  }
}

/** Brings this device's scheduled notifications in line with the saved profile settings —
 *  called whenever a profile is (re)loaded, which naturally covers app launch and sign-in
 *  without a separate "restore on startup" code path. Never prompts for permission; if it
 *  isn't already granted, the relevant schedules are just left cancelled. */
export async function syncScheduleWithProfile(settings: {
  pushNotificationsEnabled: boolean;
  dailyReminderEnabled: boolean;
  dailyReminderTime: string;
}): Promise<void> {
  try {
    const status = await getPermissionStatusAsync();
    const canSchedule = status === 'granted' && settings.pushNotificationsEnabled;

    if (canSchedule && settings.dailyReminderEnabled) {
      await scheduleDailyReminder(settings.dailyReminderTime);
    } else {
      await cancelDailyReminder();
    }
    // Session Timer Alerts has nothing to restore here — it's only ever scheduled while
    // a countdown is actively running, and a running countdown doesn't survive a relaunch.
  } catch (error) {
    console.warn('Could not sync scheduled notifications with profile settings:', error);
  }
}
