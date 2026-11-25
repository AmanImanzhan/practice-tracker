import { useEffect } from 'react';
import { useSessionsStore } from '../store/sessionsStore';
import { useAuth } from './useAuth';

export function useSessions() {
  const { user } = useAuth();
  const sessions = useSessionsStore((s) => s.sessions);
  const year = useSessionsStore((s) => s.year);
  const month = useSessionsStore((s) => s.month);
  const selectedDate = useSessionsStore((s) => s.selectedDate);
  const isLoading = useSessionsStore((s) => s.isLoading);
  const error = useSessionsStore((s) => s.error);
  const loadMonth = useSessionsStore((s) => s.loadMonth);
  const goToPreviousMonth = useSessionsStore((s) => s.goToPreviousMonth);
  const goToNextMonth = useSessionsStore((s) => s.goToNextMonth);
  const selectDate = useSessionsStore((s) => s.selectDate);
  const upsertSession = useSessionsStore((s) => s.upsertSession);
  const removeSession = useSessionsStore((s) => s.removeSession);

  useEffect(() => {
    if (user) {
      loadMonth(user.id, year, month);
    }
    // Month navigation calls loadMonth itself (see goToPreviousMonth/goToNextMonth
    // below) — this effect only needs to fire again when the signed-in user changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return {
    sessions,
    year,
    month,
    selectedDate,
    isLoading,
    error,
    goToPreviousMonth: () => user && goToPreviousMonth(user.id),
    goToNextMonth: () => user && goToNextMonth(user.id),
    goToMonth: (year: number, month: number) => user && loadMonth(user.id, year, month),
    selectDate,
    upsertSession,
    removeSession,
  };
}
