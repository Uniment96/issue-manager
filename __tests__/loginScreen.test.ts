/**
 * Unit tests for the Login screen's business logic.
 * We test the auth store interactions (login + validation) rather than
 * rendering the screen, since the screen is purely a form that calls
 * useAuthStore.login() and useUIStore.showToast().
 */

import { useAuthStore } from '../src/store/authStore';
import { useUIStore } from '../src/store/uiStore';
import { User } from '../src/types';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/services/firebase/authService', () => ({
  signIn: jest.fn(),
  signOut: jest.fn().mockResolvedValue(undefined),
  signUp: jest.fn(),
}));

const { signIn } = require('../src/services/firebase/authService');

const MANAGER_USER: User = {
  uid: 'mgr-001',
  email: 'marco@bellavista.com',
  displayName: 'Marco Rossi',
  role: 'manager',
};

const WAITER_USER: User = {
  uid: 'waiter-001',
  email: 'sofia@bellavista.com',
  displayName: 'Sofia Bianchi',
  role: 'waiter',
};

beforeEach(() => {
  useAuthStore.setState({ user: null, isLoading: false, isAuthenticated: false });
  useUIStore.setState({ toast: null });
  jest.resetAllMocks();
});

describe('Login screen — auth logic', () => {
  describe('Successful login', () => {
    it('manager can log in and gets authenticated', async () => {
      signIn.mockResolvedValue(MANAGER_USER);
      await useAuthStore.getState().login('marco@bellavista.com', 'bella123');

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.role).toBe('manager');
      expect(state.user?.displayName).toBe('Marco Rossi');
      expect(state.isLoading).toBe(false);
    });

    it('waiter can log in and gets authenticated', async () => {
      signIn.mockResolvedValue(WAITER_USER);
      await useAuthStore.getState().login('sofia@bellavista.com', 'pass');

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.role).toBe('waiter');
    });

    it('isLoading is false after successful login', async () => {
      signIn.mockResolvedValue(MANAGER_USER);
      const loginPromise = useAuthStore.getState().login('marco@bellavista.com', 'bella123');

      // isLoading should be true during login
      expect(useAuthStore.getState().isLoading).toBe(true);

      await loginPromise;
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  describe('Failed login', () => {
    it('wrong password throws and resets loading', async () => {
      signIn.mockRejectedValue(new Error('auth/wrong-password'));

      await expect(
        useAuthStore.getState().login('marco@bellavista.com', 'wrong')
      ).rejects.toThrow('auth/wrong-password');

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.isLoading).toBe(false);
    });

    it('user not found throws and resets loading', async () => {
      signIn.mockRejectedValue(new Error('User profile not found. Contact your manager.'));

      await expect(
        useAuthStore.getState().login('unknown@bellavista.com', 'pass')
      ).rejects.toThrow('User profile not found');

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('network error throws and keeps user logged out', async () => {
      signIn.mockRejectedValue(new Error('auth/network-request-failed'));

      await expect(
        useAuthStore.getState().login('marco@bellavista.com', 'bella123')
      ).rejects.toThrow('auth/network-request-failed');

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  describe('Toast notifications (UIStore)', () => {
    it('showToast sets the toast message', () => {
      useUIStore.getState().showToast('Please enter email and password', 'warning');

      const state = useUIStore.getState();
      expect(state.toast).not.toBeNull();
      expect(state.toast?.message).toBe('Please enter email and password');
      expect(state.toast?.type).toBe('warning');
    });

    it('showToast defaults to info type', () => {
      useUIStore.getState().showToast('Test message');
      expect(useUIStore.getState().toast?.type).toBe('info');
    });

    it('hideToast clears the toast', () => {
      useUIStore.getState().showToast('Some message', 'error');
      useUIStore.getState().hideToast();
      expect(useUIStore.getState().toast).toBeNull();
    });
  });

  describe('Session restoration', () => {
    it('restores manager session from cache on app start', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(MANAGER_USER));

      await useAuthStore.getState().restoreSession();

      const state = useAuthStore.getState();
      expect(state.user).toEqual(MANAGER_USER);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it('no cached user leaves state unauthenticated', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.getItem.mockResolvedValue(null);

      await useAuthStore.getState().restoreSession();

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });
});
