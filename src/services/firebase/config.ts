import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// metro.config.js maps both 'firebase/auth' and '@firebase/auth' to the RN build
// so that registerAuth('ReactNative') is called as a side-effect and
// getReactNativePersistence is exported. TypeScript still sees the browser
// types, so we cast through unknown.
import type { initializeAuth as InitializeAuth, getAuth as GetAuth, Auth, Persistence } from 'firebase/auth';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const firebaseAuth = require('firebase/auth') as {
  initializeAuth: typeof InitializeAuth;
  getAuth: typeof GetAuth;
  getReactNativePersistence: (storage: unknown) => Persistence;
};

// ✅ Firebase config (from env)
export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
};

// ✅ DEV check for missing env variables
if (__DEV__) {
  const missing = Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    console.warn(
      `[Firebase] Missing env vars: ${missing.join(', ')}.\nCheck your .env file.`
    );
  }
}

// ✅ Initialize Firebase App safely
const app: FirebaseApp =
  getApps().length === 0
    ? initializeApp(firebaseConfig)
    : getApp();

// ✅ Initialize Auth with React Native persistence
// - initializeAuth + getReactNativePersistence come from the RN build (via metro.config.js)
// - On hot reload the app persists but auth was already initialized, so we reuse via getAuth
let auth: Auth;

try {
  auth = firebaseAuth.initializeAuth(app, {
    persistence: firebaseAuth.getReactNativePersistence(AsyncStorage),
  });
} catch (error: any) {
  if (error?.code === 'auth/already-initialized') {
    auth = firebaseAuth.getAuth(app);
  } else {
    throw error;
  }
}

// ✅ Firestore
const db: Firestore = getFirestore(app);

// ✅ Optional: Health check helper (useful for debugging)
export const checkFirebaseConnection = async () => {
  try {
    const { collection, getDocs } = await import('firebase/firestore');
    const snapshot = await getDocs(collection(db, 'health_check'));
    console.log('✅ Firebase connected:', snapshot.size);
    return true;
  } catch (error) {
    console.log('❌ Firebase connection failed:', error);
    return false;
  }
};

export { app, auth, db };
export default app;
