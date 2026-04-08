// Manual Jest mock for src/services/firebase/config.ts
// Any test can use: jest.mock('../src/services/firebase/config')
// and get these stable stubs without triggering real Firebase initialization.

export const firebaseConfig = {
  apiKey: 'test-api-key',
  authDomain: 'test.firebaseapp.com',
  projectId: 'test-project',
  storageBucket: 'test.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:abc123',
};

export const auth = {
  currentUser: null,
  _isMock: true,
};

export const db = {
  _isMock: true,
};

const app = { name: '[DEFAULT]', _isMock: true };
export default app;
