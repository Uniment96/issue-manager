import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  getAuth,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { auth, db } from './config';
import { User, UserRole } from '../../types';
import { USERS_COLLECTION } from '../../constants';

// Secondary Firebase app — used by managers to create staff accounts
// without signing out the currently logged-in manager session.
function getSecondaryAuth() {
  const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
  };
  const existing = getApps().find((a) => a.name === 'secondary');
  const secondaryApp = existing ?? initializeApp(firebaseConfig, 'secondary');
  return getAuth(secondaryApp);
}

/**
 * Manager-only: create a staff account without signing out the manager.
 * Uses a secondary Firebase app instance so the manager's session is untouched.
 */
export async function createStaffAccount(
  email: string,
  password: string,
  displayName: string,
  role: UserRole
): Promise<User> {
  if (!db) throw new Error('Firebase not initialized');
  const secondaryAuth = getSecondaryAuth();
  const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
  await updateProfile(credential.user, { displayName });
  await setDoc(doc(db, USERS_COLLECTION, credential.user.uid), { displayName, email, role });
  // Immediately sign out from secondary session — manager's session is unaffected
  await firebaseSignOut(secondaryAuth);
  return { uid: credential.user.uid, email, displayName, role };
}

export async function signUp(
  email: string,
  password: string,
  displayName: string,
  role: UserRole
): Promise<User> {
  if (!auth || !db) throw new Error('Firebase not initialized');
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName });
  const user: User = { uid: credential.user.uid, email, displayName, role };
  await setDoc(doc(db, USERS_COLLECTION, credential.user.uid), { displayName, email, role });
  return user;
}

export async function signIn(email: string, password: string): Promise<User> {
  if (!auth) throw new Error('Firebase not initialized');
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const user = await fetchUserProfile(credential.user.uid);
  if (!user) throw new Error('User profile not found. Contact your manager.');
  return user;
}

export async function signOut(): Promise<void> {
  if (!auth) return;
  await firebaseSignOut(auth);
}

export async function fetchUserProfile(uid: string): Promise<User | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
  if (!snap.exists()) return null;
  return { uid, ...snap.data() } as User;
}

export async function updateFcmToken(uid: string, token: string): Promise<void> {
  if (!db) return;
  await setDoc(doc(db, USERS_COLLECTION, uid), { fcmToken: token }, { merge: true });
}

export function onAuthChanged(callback: (user: FirebaseUser | null) => void) {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
}

export async function seedUserProfile(
  uid: string,
  displayName: string,
  email: string,
  role: UserRole
): Promise<void> {
  if (!db) return;
  await setDoc(doc(db, USERS_COLLECTION, uid), { displayName, email, role });
}
