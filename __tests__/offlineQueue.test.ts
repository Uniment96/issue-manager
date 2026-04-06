import {
  loadQueue,
  saveQueue,
  enqueueOperation,
  dequeueOperation,
  incrementRetry,
  clearQueue,
} from '../src/services/offline/offlineQueue';
import { OfflineOperation } from '../src/types';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const AsyncStorage = require('@react-native-async-storage/async-storage');

const makeOp = (overrides: Partial<OfflineOperation> = {}): OfflineOperation => ({
  id: 'op-1',
  type: 'CREATE_ISSUE',
  payload: { category: 'food', description: 'Test', tableNumber: '5' },
  createdAt: 1000,
  retryCount: 0,
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('offlineQueue', () => {
  describe('loadQueue', () => {
    it('returns empty array when storage is empty', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);
      const result = await loadQueue();
      expect(result).toEqual([]);
    });

    it('returns parsed queue from storage', async () => {
      const ops = [makeOp()];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(ops));
      const result = await loadQueue();
      expect(result).toEqual(ops);
    });

    it('returns empty array on parse error', async () => {
      AsyncStorage.getItem.mockResolvedValue('invalid json{{{');
      const result = await loadQueue();
      expect(result).toEqual([]);
    });

    it('returns empty array on AsyncStorage error', async () => {
      AsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));
      const result = await loadQueue();
      expect(result).toEqual([]);
    });
  });

  describe('saveQueue', () => {
    it('serialises queue to storage', async () => {
      const ops = [makeOp()];
      await saveQueue(ops);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@offline_queue',
        JSON.stringify(ops)
      );
    });
  });

  describe('enqueueOperation', () => {
    it('appends operation with retryCount 0', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);
      const { retryCount: _, ...opWithoutRetry } = makeOp();
      await enqueueOperation(opWithoutRetry);

      const saved = JSON.parse(AsyncStorage.setItem.mock.calls[0][1]);
      expect(saved).toHaveLength(1);
      expect(saved[0].retryCount).toBe(0);
      expect(saved[0].id).toBe('op-1');
    });

    it('appends to existing queue', async () => {
      const existing = [makeOp({ id: 'op-existing' })];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(existing));
      const { retryCount: _, ...newOp } = makeOp({ id: 'op-new' });
      await enqueueOperation(newOp);

      const saved = JSON.parse(AsyncStorage.setItem.mock.calls[0][1]);
      expect(saved).toHaveLength(2);
      expect(saved.map((o: OfflineOperation) => o.id)).toEqual(['op-existing', 'op-new']);
    });
  });

  describe('dequeueOperation', () => {
    it('removes operation by id', async () => {
      const ops = [makeOp({ id: 'op-1' }), makeOp({ id: 'op-2' })];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(ops));
      await dequeueOperation('op-1');

      const saved = JSON.parse(AsyncStorage.setItem.mock.calls[0][1]);
      expect(saved).toHaveLength(1);
      expect(saved[0].id).toBe('op-2');
    });

    it('does nothing if id not found', async () => {
      const ops = [makeOp({ id: 'op-1' })];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(ops));
      await dequeueOperation('nonexistent');

      const saved = JSON.parse(AsyncStorage.setItem.mock.calls[0][1]);
      expect(saved).toHaveLength(1);
    });
  });

  describe('incrementRetry', () => {
    it('increments retryCount for matching operation', async () => {
      const ops = [makeOp({ id: 'op-1', retryCount: 1 })];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(ops));
      await incrementRetry('op-1');

      const saved = JSON.parse(AsyncStorage.setItem.mock.calls[0][1]);
      expect(saved[0].retryCount).toBe(2);
    });

    it('does not modify other operations', async () => {
      const ops = [makeOp({ id: 'op-1', retryCount: 0 }), makeOp({ id: 'op-2', retryCount: 0 })];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(ops));
      await incrementRetry('op-1');

      const saved = JSON.parse(AsyncStorage.setItem.mock.calls[0][1]);
      expect(saved[0].retryCount).toBe(1);
      expect(saved[1].retryCount).toBe(0);
    });
  });

  describe('clearQueue', () => {
    it('removes the queue key from storage', async () => {
      await clearQueue();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@offline_queue');
    });
  });
});
