import { create } from 'zustand';
import { authApi } from '../../services/api';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const getStoredUser = (): AuthUser | null => {
  try {
    const u = sessionStorage.getItem('sge_user');
    return u ? JSON.parse(u) : null;
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  user: getStoredUser(),
  token: sessionStorage.getItem('sge_token'),
  isAuthenticated: !!sessionStorage.getItem('sge_token'),
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.login(email, password);
      const { token, user } = response.data.data;

      // Security: Only allow SUPER_ADMIN to login to this frontend
      if (user.role !== 'SUPER_ADMIN') {
        set({ isLoading: false, error: 'Access denied. Only Super Admins can access this panel.' });
        return;
      }

      sessionStorage.setItem('sge_token', token);
      sessionStorage.setItem('sge_user', JSON.stringify(user));

      set({ token, user, isAuthenticated: true, isLoading: false, error: null });
    } catch (err: any) {
      const message = err.response?.data?.message || 'Login failed. Please try again.';
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  logout: () => {
    sessionStorage.removeItem('sge_token');
    sessionStorage.removeItem('sge_user');
    set({ user: null, token: null, isAuthenticated: false, error: null });
  },

  clearError: () => set({ error: null }),
}));
