jest.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  updateProfile: jest.fn().mockResolvedValue(undefined),
  signOut: jest.fn().mockResolvedValue(undefined),
  onAuthStateChanged: jest.fn(),
}));

const MOCK_DOC_REF = { _type: 'DocumentReference' };

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => MOCK_DOC_REF),
  getDoc: jest.fn(),
  setDoc: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/services/firebase/config', () => ({
  auth: { currentUser: null, _isMock: true },
  db: { _isMock: true },
}));

import {
  signIn,
  signOut,
  signUp,
  fetchUserProfile,
  updateFcmToken,
  seedUserProfile,
  onAuthChanged,
} from '../src/services/firebase/authService';
import { User } from '../src/types';

const {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut: firebaseSignOut,
  onAuthStateChanged,
} = require('firebase/auth');
const { getDoc, setDoc } = require('firebase/firestore');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('authService', () => {
  describe('signIn', () => {
    it('returns user profile on success', async () => {
      signInWithEmailAndPassword.mockResolvedValue({ user: { uid: 'uid-1' } });
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ displayName: 'Alice', email: 'alice@test.com', role: 'waiter' }),
      });

      const user = await signIn('alice@test.com', 'password');
      expect(user).toMatchObject({ uid: 'uid-1', role: 'waiter', displayName: 'Alice' });
    });

    it('throws if user profile not found in Firestore', async () => {
      signInWithEmailAndPassword.mockResolvedValue({ user: { uid: 'uid-no-profile' } });
      getDoc.mockResolvedValue({ exists: () => false });

      await expect(signIn('noprofile@test.com', 'pass')).rejects.toThrow(
        'User profile not found'
      );
    });

    it('propagates Firebase auth errors', async () => {
      signInWithEmailAndPassword.mockRejectedValue(new Error('auth/wrong-password'));
      await expect(signIn('bad@test.com', 'wrong')).rejects.toThrow('auth/wrong-password');
    });
  });

  describe('signOut', () => {
    it('calls firebaseSignOut', async () => {
      await signOut();
      expect(firebaseSignOut).toHaveBeenCalled();
    });
  });

  describe('signUp', () => {
    it('creates auth user, updates profile, writes Firestore doc', async () => {
      createUserWithEmailAndPassword.mockResolvedValue({
        user: { uid: 'new-uid' },
      });

      const user = await signUp('new@test.com', 'pass123', 'New User', 'chef');

      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'new@test.com',
        'pass123'
      );
      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(),
        { displayName: 'New User', email: 'new@test.com', role: 'chef' }
      );
      expect(user).toMatchObject({
        uid: 'new-uid',
        email: 'new@test.com',
        displayName: 'New User',
        role: 'chef',
      });
    });

    it('propagates Firebase errors', async () => {
      createUserWithEmailAndPassword.mockRejectedValue(new Error('auth/email-already-in-use'));
      await expect(signUp('exists@test.com', 'pass', 'Name', 'waiter')).rejects.toThrow(
        'auth/email-already-in-use'
      );
    });
  });

  describe('fetchUserProfile', () => {
    it('returns user profile when document exists', async () => {
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ displayName: 'Bob', email: 'bob@test.com', role: 'manager' }),
      });

      const user = await fetchUserProfile('uid-bob');
      expect(user).toMatchObject({ uid: 'uid-bob', role: 'manager' });
    });

    it('returns null when document does not exist', async () => {
      getDoc.mockResolvedValue({ exists: () => false });
      const user = await fetchUserProfile('uid-missing');
      expect(user).toBeNull();
    });
  });

  describe('updateFcmToken', () => {
    it('calls setDoc with merge option', async () => {
      await updateFcmToken('uid-1', 'fcm-token-abc');
      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(),
        { fcmToken: 'fcm-token-abc' },
        { merge: true }
      );
    });
  });

  describe('seedUserProfile', () => {
    it('writes user profile to Firestore', async () => {
      await seedUserProfile('uid-seed', 'Seed User', 'seed@test.com', 'supervisor');
      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(),
        { displayName: 'Seed User', email: 'seed@test.com', role: 'supervisor' }
      );
    });
  });

  describe('onAuthChanged', () => {
    it('registers auth state listener and returns unsubscribe', () => {
      const unsubFn = jest.fn();
      onAuthStateChanged.mockReturnValue(unsubFn);
      const callback = jest.fn();

      const unsub = onAuthChanged(callback);
      expect(onAuthStateChanged).toHaveBeenCalledWith(expect.anything(), callback);
      expect(unsub).toBe(unsubFn);
    });
  });
});
