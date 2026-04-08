import { useAuthStore } from '../src/store/authStore';
import { User } from '../src/types';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/services/firebase/authService', () => ({
  signIn: jest.fn(),
  signOut: jest.fn().mockResolvedValue(undefined),
  signUp: jest.fn(),
}));

const AsyncStorage = require('@react-native-async-storage/async-storage');
const { signIn, signUp } = require('../src/services/firebase/authService');

const MOCK_USER: User = {
  uid: 'uid-1',
  email: 'test@example.com',
  displayName: 'Test User',
  role: 'waiter',
};

beforeEach(() => {
  useAuthStore.setState({
    user: null,
    isLoading: false,
    isAuthenticated: false,
  });
  jest.resetAllMocks();
  // Restore default resolved values after reset
  AsyncStorage.setItem.mockResolvedValue(undefined);
  AsyncStorage.removeItem.mockResolvedValue(undefined);
});

describe('authStore', () => {
  describe('setUser', () => {
    it('sets user and isAuthenticated', () => {
      useAuthStore.getState().setUser(MOCK_USER);
      expect(useAuthStore.getState().user).toEqual(MOCK_USER);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('persists user to AsyncStorage', () => {
      useAuthStore.getState().setUser(MOCK_USER);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@cached_user',
        JSON.stringify(MOCK_USER)
      );
    });

    it('clears user with null', () => {
      useAuthStore.setState({ user: MOCK_USER, isAuthenticated: true });
      useAuthStore.getState().setUser(null);
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@cached_user');
    });
  });

  describe('login', () => {
    it('calls signIn and updates state on success', async () => {
      signIn.mockResolvedValue(MOCK_USER);
      await useAuthStore.getState().login('test@example.com', 'password');

      expect(signIn).toHaveBeenCalledWith('test@example.com', 'password');
      expect(useAuthStore.getState().user).toEqual(MOCK_USER);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('persists user to AsyncStorage after login', async () => {
      signIn.mockResolvedValue(MOCK_USER);
      await useAuthStore.getState().login('test@example.com', 'password');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@cached_user',
        JSON.stringify(MOCK_USER)
      );
    });

    it('clears loading and rethrows on failure', async () => {
      signIn.mockRejectedValue(new Error('Invalid credentials'));
      await expect(
        useAuthStore.getState().login('bad@example.com', 'wrong')
      ).rejects.toThrow('Invalid credentials');
      expect(useAuthStore.getState().isLoading).toBe(false);
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  describe('logout', () => {
    it('clears user state and AsyncStorage', async () => {
      const { signOut } = require('../src/services/firebase/authService');
      signOut.mockResolvedValue(undefined);
      useAuthStore.setState({ user: MOCK_USER, isAuthenticated: true });
      await useAuthStore.getState().logout();

      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@cached_user');
    });
  });

  describe('register', () => {
    it('calls signUp and sets user state', async () => {
      signUp.mockResolvedValue(MOCK_USER);
      await useAuthStore.getState().register(
        'new@example.com',
        'password123',
        'New User',
        'chef'
      );

      expect(signUp).toHaveBeenCalledWith('new@example.com', 'password123', 'New User', 'chef');
      expect(useAuthStore.getState().user).toEqual(MOCK_USER);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    it('resets loading and rethrows on failure', async () => {
      signUp.mockRejectedValue(new Error('Email already in use'));
      await expect(
        useAuthStore.getState().register('exists@example.com', 'pass', 'Name', 'waiter')
      ).rejects.toThrow('Email already in use');
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  describe('restoreSession', () => {
    it('restores user from AsyncStorage', async () => {
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(MOCK_USER));
      await useAuthStore.getState().restoreSession();

      expect(useAuthStore.getState().user).toEqual(MOCK_USER);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('sets isLoading false when no cached session', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);
      await useAuthStore.getState().restoreSession();

      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('handles AsyncStorage errors gracefully', async () => {
      AsyncStorage.getItem.mockRejectedValue(new Error('Storage read error'));
      await expect(useAuthStore.getState().restoreSession()).resolves.not.toThrow();
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });
});
