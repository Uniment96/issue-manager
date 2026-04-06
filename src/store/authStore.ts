import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, UserRole } from '../types';
import { signIn, signOut, signUp } from '../services/firebase/authService';

const USER_CACHE_KEY = '@cached_user';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => {
    set({ user, isAuthenticated: !!user, isLoading: false });
    if (user) {
      AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    } else {
      AsyncStorage.removeItem(USER_CACHE_KEY);
    }
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const user = await signIn(email, password);
      set({ user, isAuthenticated: true, isLoading: false });
      await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  register: async (email, password, displayName, role) => {
    set({ isLoading: true });
    try {
      const user = await signUp(email, password, displayName, role);
      set({ user, isAuthenticated: true, isLoading: false });
      await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    await signOut();
    await AsyncStorage.removeItem(USER_CACHE_KEY);
    set({ user: null, isAuthenticated: false });
  },

  restoreSession: async () => {
    try {
      const raw = await AsyncStorage.getItem(USER_CACHE_KEY);
      if (raw) {
        const user = JSON.parse(raw) as User;
        set({ user, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));
