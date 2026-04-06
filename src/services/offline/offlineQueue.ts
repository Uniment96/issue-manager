import AsyncStorage from '@react-native-async-storage/async-storage';
import { OfflineOperation } from '../../types';

const QUEUE_KEY = '@offline_queue';

export async function loadQueue(): Promise<OfflineOperation[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as OfflineOperation[]) : [];
  } catch {
    return [];
  }
}

export async function saveQueue(queue: OfflineOperation[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function enqueueOperation(op: Omit<OfflineOperation, 'retryCount'>): Promise<void> {
  const queue = await loadQueue();
  queue.push({ ...op, retryCount: 0 });
  await saveQueue(queue);
}

export async function dequeueOperation(id: string): Promise<void> {
  const queue = await loadQueue();
  await saveQueue(queue.filter((op) => op.id !== id));
}

export async function incrementRetry(id: string): Promise<void> {
  const queue = await loadQueue();
  const updated = queue.map((op) =>
    op.id === id ? { ...op, retryCount: op.retryCount + 1 } : op
  );
  await saveQueue(updated);
}

export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}
