import NetInfo from '@react-native-community/netinfo';
import { loadQueue, dequeueOperation, incrementRetry } from './offlineQueue';
import { createIssue, updateIssueStatus } from '../firebase/issueService';
import { apiCreateIssue, apiUpdateIssue } from '../api/issueApi';
import { OfflineOperation } from '../../types';

export const MAX_RETRIES = 3;

async function processOperation(op: OfflineOperation, uid: string, displayName: string): Promise<void> {
  if (op.type === 'CREATE_ISSUE') {
    const { category, description, tableNumber } = op.payload;
    // Dual-write: Firestore + REST
    await createIssue({ category, description, tableNumber }, uid, displayName);
    try {
      await apiCreateIssue({ category, description, tableNumber });
    } catch {
      // REST failure is non-blocking; Firestore is source of truth
    }
  } else if (op.type === 'UPDATE_ISSUE') {
    const { id, status } = op.payload;
    if (!id || !status) throw new Error('Invalid UPDATE_ISSUE payload');
    await updateIssueStatus(id, status);
    try {
      await apiUpdateIssue(id, status);
    } catch {
      // REST failure is non-blocking
    }
  }
}

export async function flushQueue(uid: string, displayName: string): Promise<void> {
  const queue = await loadQueue();
  if (queue.length === 0) return;

  for (const op of queue) {
    if (op.retryCount >= MAX_RETRIES) {
      await dequeueOperation(op.id);
      console.warn(`[SyncService] Abandoned operation ${op.id} after ${MAX_RETRIES} retries`);
      continue;
    }
    try {
      await processOperation(op, uid, displayName);
      await dequeueOperation(op.id);
    } catch {
      await incrementRetry(op.id);
    }
  }
}

/**
 * Start listening to network changes and flush queue on reconnect.
 * Returns the unsubscribe function.
 */
export function startSyncListener(uid: string, displayName: string): () => void {
  let wasOffline = false;

  return NetInfo.addEventListener((state) => {
    const isConnected = state.isConnected ?? false;
    if (isConnected && wasOffline) {
      flushQueue(uid, displayName);
    }
    wasOffline = !isConnected;
  });
}
