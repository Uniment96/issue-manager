import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { initializeAuth, getAuth, inMemoryPersistence, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const IS_MOCK = process.env.EXPO_PUBLIC_DEV_MOCK === 'true';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
};

// In mock mode skip Firebase entirely — no native modules needed.
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (!IS_MOCK) {
  const isFirstInit = getApps().length === 0;
  app = isFirstInit ? initializeApp(firebaseConfig) : getApp();
  try {
    auth = isFirstInit
      ? initializeAuth(app, { persistence: inMemoryPersistence })
      : getAuth(app);
  } catch (e) {
    console.warn('Firebase Auth init failed:', e);
  }
  db = getFirestore(app);
}

export { auth, db };
export default app;
