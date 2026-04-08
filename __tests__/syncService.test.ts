// Mock Firebase config FIRST — prevents real Firebase initialization
// (config.ts would crash in Node with auth/invalid-api-key on empty env vars)
jest.mock('../src/services/firebase/config');

import { flushQueue, MAX_RETRIES } from '../src/services/offline/syncService';
import * as offlineQueue from '../src/services/offline/offlineQueue';
import * as issueService from '../src/services/firebase/issueService';
import * as issueApi from '../src/services/api/issueApi';
import { OfflineOperation } from '../src/types';

jest.mock('../src/services/offline/offlineQueue');
jest.mock('../src/services/firebase/issueService');
jest.mock('../src/services/api/issueApi');
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
}));

const mockLoadQueue = offlineQueue.loadQueue as jest.MockedFunction<typeof offlineQueue.loadQueue>;
const mockDequeue = offlineQueue.dequeueOperation as jest.MockedFunction<typeof offlineQueue.dequeueOperation>;
const mockIncrementRetry = offlineQueue.incrementRetry as jest.MockedFunction<typeof offlineQueue.incrementRetry>;
const mockCreateIssue = issueService.createIssue as jest.MockedFunction<typeof issueService.createIssue>;
const mockUpdateStatus = issueService.updateIssueStatus as jest.MockedFunction<typeof issueService.updateIssueStatus>;
const mockApiCreate = issueApi.apiCreateIssue as jest.MockedFunction<typeof issueApi.apiCreateIssue>;
const mockApiUpdate = issueApi.apiUpdateIssue as jest.MockedFunction<typeof issueApi.apiUpdateIssue>;

const makeCreateOp = (overrides: Partial<OfflineOperation> = {}): OfflineOperation => ({
  id: 'op-create-1',
  type: 'CREATE_ISSUE',
  payload: { category: 'food', description: 'Test issue', tableNumber: '5' },
  createdAt: Date.now(),
  retryCount: 0,
  ...overrides,
});

const makeUpdateOp = (overrides: Partial<OfflineOperation> = {}): OfflineOperation => ({
  id: 'op-update-1',
  type: 'UPDATE_ISSUE',
  payload: { id: 'issue-123', status: 'RESOLVED', category: 'food', description: 'desc', tableNumber: '5' },
  createdAt: Date.now(),
  retryCount: 0,
  ...overrides,
});

beforeEach(() => {
  jest.resetAllMocks();
  mockDequeue.mockResolvedValue(undefined);
  mockIncrementRetry.mockResolvedValue(undefined);
  mockCreateIssue.mockResolvedValue('new-firestore-id');
  mockUpdateStatus.mockResolvedValue(undefined);
  mockApiCreate.mockResolvedValue({} as any);
  mockApiUpdate.mockResolvedValue({} as any);
});

describe('syncService', () => {
  describe('flushQueue', () => {
    it('does nothing when queue is empty', async () => {
      mockLoadQueue.mockResolvedValue([]);
      await flushQueue('uid-1', 'Test User');
      expect(mockCreateIssue).not.toHaveBeenCalled();
      expect(mockUpdateStatus).not.toHaveBeenCalled();
    });

    it('processes CREATE_ISSUE and dequeues on success', async () => {
      mockLoadQueue.mockResolvedValue([makeCreateOp()]);
      await flushQueue('uid-1', 'Test User');

      expect(mockCreateIssue).toHaveBeenCalledWith(
        { category: 'food', description: 'Test issue', tableNumber: '5' },
        'uid-1',
        'Test User'
      );
      expect(mockDequeue).toHaveBeenCalledWith('op-create-1');
    });

    it('also calls REST API for CREATE_ISSUE (non-blocking)', async () => {
      mockLoadQueue.mockResolvedValue([makeCreateOp()]);
      await flushQueue('uid-1', 'Test User');
      expect(mockApiCreate).toHaveBeenCalledWith({
        category: 'food',
        description: 'Test issue',
        tableNumber: '5',
      });
    });

    it('REST API failure does not fail the operation', async () => {
      mockApiCreate.mockRejectedValue(new Error('REST error'));
      mockLoadQueue.mockResolvedValue([makeCreateOp()]);
      await expect(flushQueue('uid-1', 'Test User')).resolves.not.toThrow();
      expect(mockDequeue).toHaveBeenCalledWith('op-create-1');
    });

    it('processes UPDATE_ISSUE and dequeues on success', async () => {
      mockLoadQueue.mockResolvedValue([makeUpdateOp()]);
      await flushQueue('uid-1', 'Test User');

      expect(mockUpdateStatus).toHaveBeenCalledWith('issue-123', 'RESOLVED');
      expect(mockDequeue).toHaveBeenCalledWith('op-update-1');
    });

    it('also calls REST API for UPDATE_ISSUE', async () => {
      mockLoadQueue.mockResolvedValue([makeUpdateOp()]);
      await flushQueue('uid-1', 'Test User');
      expect(mockApiUpdate).toHaveBeenCalledWith('issue-123', 'RESOLVED');
    });

    it('increments retry on Firestore failure', async () => {
      mockCreateIssue.mockRejectedValue(new Error('Firestore error'));
      mockLoadQueue.mockResolvedValue([makeCreateOp()]);
      await flushQueue('uid-1', 'Test User');

      expect(mockIncrementRetry).toHaveBeenCalledWith('op-create-1');
      expect(mockDequeue).not.toHaveBeenCalled();
    });

    it('abandons operation when MAX_RETRIES exceeded', async () => {
      const exhaustedOp = makeCreateOp({ retryCount: MAX_RETRIES });
      mockLoadQueue.mockResolvedValue([exhaustedOp]);
      await flushQueue('uid-1', 'Test User');

      expect(mockDequeue).toHaveBeenCalledWith('op-create-1');
      expect(mockCreateIssue).not.toHaveBeenCalled();
    });

    it('processes all operations in queue', async () => {
      mockLoadQueue.mockResolvedValue([makeCreateOp({ id: 'op-1' }), makeUpdateOp({ id: 'op-2' })]);
      await flushQueue('uid-1', 'Test User');

      expect(mockDequeue).toHaveBeenCalledTimes(2);
    });

    it('continues processing after one operation fails', async () => {
      mockCreateIssue
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce('id-2');
      mockLoadQueue.mockResolvedValue([
        makeCreateOp({ id: 'op-fail' }),
        makeCreateOp({ id: 'op-ok' }),
      ]);
      await flushQueue('uid-1', 'Test User');

      expect(mockIncrementRetry).toHaveBeenCalledWith('op-fail');
      expect(mockDequeue).toHaveBeenCalledWith('op-ok');
    });

    it('increments retry for UPDATE_ISSUE with missing id', async () => {
      const badOp: OfflineOperation = {
        ...makeUpdateOp(),
        payload: { category: 'food', description: 'desc', tableNumber: '5' }, // no id
      };
      mockLoadQueue.mockResolvedValue([badOp]);
      await flushQueue('uid-1', 'Test User');
      expect(mockIncrementRetry).toHaveBeenCalled();
    });
  });

  describe('MAX_RETRIES constant', () => {
    it('is 3', () => {
      expect(MAX_RETRIES).toBe(3);
    });
  });
});
