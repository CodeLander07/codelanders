import { create } from 'zustand';
import { api } from '@/lib/api';

interface User {
  id: number;
  email: string;
  full_name?: string;
  // add other fields as needed
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('taxmate_token') : null,
  isAuthenticated: !!(typeof window !== 'undefined' ? localStorage.getItem('taxmate_token') : null),
  
  login: (token, user) => {
    localStorage.setItem('taxmate_token', token);
    set({ user, token, isAuthenticated: true });
  },
  
  logout: () => {
    localStorage.removeItem('taxmate_token');
    set({ user: null, token: null, isAuthenticated: false });
  },
  
  checkAuth: async () => {
    try {
      const token = localStorage.getItem('taxmate_token');
      if (!token) return;
      const response = await api.get('/auth/me');
      set({ user: response.data, isAuthenticated: true });
    } catch (error) {
      localStorage.removeItem('taxmate_token');
      set({ user: null, token: null, isAuthenticated: false });
    }
  }
}));
