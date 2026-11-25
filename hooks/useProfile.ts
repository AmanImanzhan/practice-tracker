import { useEffect } from 'react';
import { useProfileStore } from '../store/profileStore';
import { useAuth } from './useAuth';

export function useProfile() {
  const { user } = useAuth();
  const profile = useProfileStore((s) => s.profile);
  const isLoading = useProfileStore((s) => s.isLoading);
  const error = useProfileStore((s) => s.error);
  const loadProfile = useProfileStore((s) => s.loadProfile);
  const setProfile = useProfileStore((s) => s.setProfile);

  useEffect(() => {
    if (user) loadProfile(user.id);
  }, [user, loadProfile]);

  return { profile, isLoading, error, setProfile };
}
