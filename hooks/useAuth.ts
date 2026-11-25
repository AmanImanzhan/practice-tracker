import { useAuthStore } from '../store/authStore';

export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isHydrating = useAuthStore((state) => state.isHydrating);
  const initialize = useAuthStore((state) => state.initialize);
  const signOut = useAuthStore((state) => state.signOut);

  return { user, isAuthenticated, isHydrating, initialize, signOut };
}
