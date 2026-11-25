import { create } from 'zustand';
import { repositories } from '../repositories';
import type { PracticeSession } from '../types/domain';
import { daysInMonth, toISODate, todayParts } from '../lib/date';

function defaultSelectedDate(year: number, month: number): string {
  const today = todayParts();
  const isCurrentMonth = today.year === year && today.month === month;
  const day = isCurrentMonth ? today.day : daysInMonth(year, month);
  return toISODate(year, month, day);
}

interface SessionsState {
  sessions: PracticeSession[];
  year: number;
  month: number; // 1-12
  selectedDate: string;
  isLoading: boolean;
  error: string | null;
  loadMonth: (userId: string, year: number, month: number) => Promise<void>;
  goToPreviousMonth: (userId: string) => Promise<void>;
  goToNextMonth: (userId: string) => Promise<void>;
  selectDate: (date: string) => void;
  /** Inserts or replaces one session in local state — used after the day modal
   *  creates/updates a session, so the table reflects it without a full month refetch. */
  upsertSession: (session: PracticeSession) => void;
  removeSession: (sessionId: string) => void;
  /** Resets to the same defaults the store starts with — used after account deletion,
   *  so a subsequent sign-up on the same device never briefly shows the previous
   *  account's sessions or month selection. */
  clear: () => void;
}

const initialToday = todayParts();

export const useSessionsStore = create<SessionsState>((set, get) => ({
  sessions: [],
  year: initialToday.year,
  month: initialToday.month,
  selectedDate: defaultSelectedDate(initialToday.year, initialToday.month),
  isLoading: false,
  error: null,

  loadMonth: async (userId, year, month) => {
    set({ isLoading: true, error: null, year, month, selectedDate: defaultSelectedDate(year, month) });
    try {
      const startDate = toISODate(year, month, 1);
      const endDate = toISODate(year, month, daysInMonth(year, month));
      const sessions = await repositories.sessions.getByDateRange(userId, startDate, endDate);
      set({ sessions, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Could not load practice sessions.',
      });
    }
  },

  goToPreviousMonth: async (userId) => {
    const { year, month, loadMonth } = get();
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    await loadMonth(userId, prevYear, prevMonth);
  },

  goToNextMonth: async (userId) => {
    const { year, month, loadMonth } = get();
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    await loadMonth(userId, nextYear, nextMonth);
  },

  selectDate: (date) => set({ selectedDate: date }),

  upsertSession: (session) =>
    set((state) => {
      const index = state.sessions.findIndex((s) => s.id === session.id);
      if (index === -1) {
        return { sessions: [...state.sessions, session].sort((a, b) => a.date.localeCompare(b.date)) };
      }
      const next = [...state.sessions];
      next[index] = session;
      return { sessions: next };
    }),

  removeSession: (sessionId) =>
    set((state) => ({ sessions: state.sessions.filter((s) => s.id !== sessionId) })),

  clear: () => {
    const today = todayParts();
    set({
      sessions: [],
      year: today.year,
      month: today.month,
      selectedDate: defaultSelectedDate(today.year, today.month),
      isLoading: false,
      error: null,
    });
  },
}));
