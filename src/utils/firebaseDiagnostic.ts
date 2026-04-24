/**
 * Firebase Diagnostic Utility
 *
 * Run this once to verify your Firebase project is correctly configured:
 *   - Firestore read/write works
 *   - Auth can create/sign-in a test user
 *   - Firestore user profile is stored and retrievable
 *
 * Usage (e.g. in _layout.tsx useEffect, or a dev-only button):
 *
 *   import { runFirebaseDiagnostic } from '@/utils/firebaseDiagnostic';
 *   runFirebaseDiagnostic().then(console.log).catch(console.error);
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  deleteUser,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { auth, db } from '../services/firebase/config';

const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'Test@1234';
const TEST_COLLECTION = '_diagnostics';
const TEST_DOC_ID = 'connection_test';

export interface DiagnosticResult {
  overall: 'pass' | 'fail';
  steps: {
    firestoreWrite: StepResult;
    firestoreRead: StepResult;
    authCreateUser: StepResult;
    firestoreStoreProfile: StepResult;
    firestoreReadProfile: StepResult;
    cleanup: StepResult;
  };
}

interface StepResult {
  status: 'pass' | 'fail' | 'skip';
  message: string;
  durationMs?: number;
}

function pass(message: string, durationMs?: number): StepResult {
  console.log(`  ✅ ${message}${durationMs !== undefined ? ` (${durationMs}ms)` : ''}`);
  return { status: 'pass', message, durationMs };
}

function fail(message: string, error: unknown): StepResult {
  const detail = error instanceof Error ? error.message : String(error);
  console.error(`  ❌ ${message}: ${detail}`);
  return { status: 'fail', message: `${message}: ${detail}` };
}

function skip(message: string): StepResult {
  console.warn(`  ⏭️  ${message}`);
  return { status: 'skip', message };
}

export async function runFirebaseDiagnostic(): Promise<DiagnosticResult> {
  console.log('\n🔥 ─── Firebase Diagnostic ───────────────────────────');

  const steps: DiagnosticResult['steps'] = {
    firestoreWrite: skip('not run'),
    firestoreRead: skip('not run'),
    authCreateUser: skip('not run'),
    firestoreStoreProfile: skip('not run'),
    firestoreReadProfile: skip('not run'),
    cleanup: skip('not run'),
  };

  let firebaseUid: string | null = null;

  // ── Step 1: Firestore write ──────────────────────────────────────────────
  console.log('\n1️⃣  Firestore write');
  try {
    const t0 = Date.now();
    await setDoc(doc(db, TEST_COLLECTION, TEST_DOC_ID), {
      message: 'Firebase diagnostic test',
      timestamp: serverTimestamp(),
    });
    steps.firestoreWrite = pass('Wrote document to Firestore', Date.now() - t0);
  } catch (e) {
    steps.firestoreWrite = fail('Firestore write failed', e);
  }

  // ── Step 2: Firestore read ───────────────────────────────────────────────
  console.log('\n2️⃣  Firestore read');
  if (steps.firestoreWrite.status === 'pass') {
    try {
      const t0 = Date.now();
      const snap = await getDoc(doc(db, TEST_COLLECTION, TEST_DOC_ID));
      if (!snap.exists()) throw new Error('Document not found after write');
      const data = snap.data();
      if (data?.message !== 'Firebase diagnostic test') {
        throw new Error(`Unexpected data: ${JSON.stringify(data)}`);
      }
      steps.firestoreRead = pass(
        `Read document — message: "${data.message}"`,
        Date.now() - t0
      );
    } catch (e) {
      steps.firestoreRead = fail('Firestore read failed', e);
    }
  } else {
    steps.firestoreRead = skip('Skipped — write step failed');
  }

  // ── Step 3: Firebase Auth — create test user ─────────────────────────────
  console.log('\n3️⃣  Firebase Auth — create test user');
  try {
    const t0 = Date.now();
    let credential;
    try {
      // Try to create; if account exists, sign in instead
      credential = await createUserWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
      steps.authCreateUser = pass(
        `Created test user (${TEST_EMAIL}) — uid: ${credential.user.uid}`,
        Date.now() - t0
      );
    } catch (createErr: any) {
      if (createErr?.code === 'auth/email-already-in-use') {
        console.warn(`  ⚠️  ${TEST_EMAIL} already exists — signing in instead`);
        credential = await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
        steps.authCreateUser = pass(
          `Signed in as existing test user (${TEST_EMAIL}) — uid: ${credential.user.uid}`,
          Date.now() - t0
        );
      } else {
        throw createErr;
      }
    }
    firebaseUid = credential.user.uid;
  } catch (e) {
    steps.authCreateUser = fail('Firebase Auth failed', e);
  }

  // ── Step 4: Store user profile in Firestore ──────────────────────────────
  console.log('\n4️⃣  Firestore — store user profile');
  if (firebaseUid) {
    try {
      const t0 = Date.now();
      await setDoc(doc(db, 'users', firebaseUid), {
        displayName: 'Diagnostic Test User',
        email: TEST_EMAIL,
        role: 'waiter',
        createdAt: serverTimestamp(),
      });
      steps.firestoreStoreProfile = pass(
        `Wrote user profile to users/${firebaseUid}`,
        Date.now() - t0
      );
    } catch (e) {
      steps.firestoreStoreProfile = fail('Writing user profile failed', e);
    }
  } else {
    steps.firestoreStoreProfile = skip('Skipped — Auth step failed');
  }

  // ── Step 5: Read back user profile ──────────────────────────────────────
  console.log('\n5️⃣  Firestore — read back user profile');
  if (firebaseUid && steps.firestoreStoreProfile.status === 'pass') {
    try {
      const t0 = Date.now();
      const snap = await getDoc(doc(db, 'users', firebaseUid));
      if (!snap.exists()) throw new Error('User profile not found after write');
      const data = snap.data();
      if (data?.email !== TEST_EMAIL) throw new Error(`Email mismatch: ${data?.email}`);
      steps.firestoreReadProfile = pass(
        `Read user profile — email: ${data.email}, role: ${data.role}`,
        Date.now() - t0
      );
    } catch (e) {
      steps.firestoreReadProfile = fail('Reading user profile failed', e);
    }
  } else {
    steps.firestoreReadProfile = skip('Skipped — profile write step failed');
  }

  // ── Step 6: Cleanup ──────────────────────────────────────────────────────
  console.log('\n6️⃣  Cleanup');
  const cleanupErrors: string[] = [];

  try {
    await deleteDoc(doc(db, TEST_COLLECTION, TEST_DOC_ID));
  } catch (e) {
    cleanupErrors.push(`diagnostic doc: ${e instanceof Error ? e.message : e}`);
  }

  if (firebaseUid) {
    try {
      await deleteDoc(doc(db, 'users', firebaseUid));
    } catch (e) {
      cleanupErrors.push(`user profile: ${e instanceof Error ? e.message : e}`);
    }
    try {
      // Delete the Auth user — only works if they're currently signed in
      const currentUser = auth.currentUser;
      if (currentUser && currentUser.uid === firebaseUid) {
        await deleteUser(currentUser);
      } else {
        cleanupErrors.push('Auth user not deleted — sign them in first or delete manually in Firebase Console');
      }
    } catch (e) {
      cleanupErrors.push(`auth user: ${e instanceof Error ? e.message : e}`);
    }
  }

  steps.cleanup =
    cleanupErrors.length === 0
      ? pass('Cleaned up all test data')
      : fail('Partial cleanup', cleanupErrors.join('; '));

  // ── Summary ──────────────────────────────────────────────────────────────
  const allPassed = Object.values(steps).every(
    (s) => s.status === 'pass' || s.status === 'skip'
  );
  const overall: DiagnosticResult['overall'] = allPassed ? 'pass' : 'fail';

  console.log('\n─────────────────────────────────────────────────────');
  console.log(`🏁 Result: ${overall === 'pass' ? '✅ ALL PASSED' : '❌ SOME STEPS FAILED'}`);
  Object.entries(steps).forEach(([name, result]) => {
    const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⏭️';
    console.log(`   ${icon} ${name}: ${result.message}`);
  });
  console.log('─────────────────────────────────────────────────────\n');

  return { overall, steps };
}
