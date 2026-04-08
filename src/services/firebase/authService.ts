import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  getAuth,
  initializeAuth,
  inMemoryPersistence,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getApps, initializeApp } from 'firebase/app';
import { auth, db, firebaseConfig } from './config';
import { User, UserRole } from '../../types';
import { USERS_COLLECTION } from '../../constants';

// Secondary Firebase app — used by managers to create staff accounts
// without signing out the currently logged-in manager session.
function getSecondaryAuth() {
  const existing = getApps().find((a) => a.name === 'secondary');
  const secondaryApp = existing ?? initializeApp(firebaseConfig, 'secondary');
  try {
    return initializeAuth(secondaryApp, { persistence: inMemoryPersistence });
  } catch {
    return getAuth(secondaryApp);
  }
}

export async function createStaffAccount(
  email: string,
  password: string,
  displayName: string,
  role: UserRole
): Promise<User> {
  const secondaryAuth = getSecondaryAuth();
  const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
  await updateProfile(credential.user, { displayName });
  await setDoc(doc(db, USERS_COLLECTION, credential.user.uid), { displayName, email, role });
  await firebaseSignOut(secondaryAuth);
  return { uid: credential.user.uid, email, displayName, role };
}

export async function signUp(
  email: string,
  password: string,
  displayName: string,
  role: UserRole
): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName });
  const user: User = { uid: credential.user.uid, email, displayName, role };
  await setDoc(doc(db, USERS_COLLECTION, credential.user.uid), { displayName, email, role });
  return user;
}

export async function signIn(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const user = await fetchUserProfile(credential.user.uid);
  if (!user) throw new Error('User profile not found. Contact your manager.');
  return user;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export async function fetchUserProfile(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
  if (!snap.exists()) return null;
  return { uid, ...snap.data() } as User;
}

export async function updateFcmToken(uid: string, token: string): Promise<void> {
  await setDoc(doc(db, USERS_COLLECTION, uid), { fcmToken: token }, { merge: true });
}

export function onAuthChanged(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function seedUserProfile(
  uid: string,
  displayName: string,
  email: string,
  role: UserRole
): Promise<void> {
  await setDoc(doc(db, USERS_COLLECTION, uid), { displayName, email, role });
}
