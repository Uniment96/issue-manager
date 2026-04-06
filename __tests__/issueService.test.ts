// Mock firebase/firestore before importing the module under test
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  onSnapshot: jest.fn(),
  serverTimestamp: jest.fn(() => ({ _serverTimestamp: true })),
  Timestamp: class {
    toMillis() { return 0; }
  },
}));

jest.mock('../src/services/firebase/config', () => ({
  db: { _isMockDb: true },
}));

import {
  createIssue,
  updateIssueStatus,
  subscribeToIssues,
} from '../src/services/firebase/issueService';
import { addDoc, updateDoc, onSnapshot, collection, doc, query } from 'firebase/firestore';

const mockAddDoc = addDoc as jest.MockedFunction<typeof addDoc>;
const mockUpdateDoc = updateDoc as jest.MockedFunction<typeof updateDoc>;
const mockOnSnapshot = onSnapshot as jest.MockedFunction<typeof onSnapshot>;
const mockCollection = collection as jest.MockedFunction<typeof collection>;
const mockDoc = doc as jest.MockedFunction<typeof doc>;
const mockQuery = query as jest.MockedFunction<typeof query>;

beforeEach(() => {
  jest.clearAllMocks();
  mockCollection.mockReturnValue({} as any);
  mockDoc.mockReturnValue({} as any);
  mockQuery.mockReturnValue({} as any);
});

describe('issueService', () => {
  describe('createIssue', () => {
    it('calls addDoc with correct data', async () => {
      mockAddDoc.mockResolvedValue({ id: 'new-doc-id' } as any);

      const id = await createIssue(
        { category: 'food', description: 'Cold soup', tableNumber: '7' },
        'user-uid',
        'John Doe'
      );

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          category: 'food',
          description: 'Cold soup',
          tableNumber: '7',
          status: 'OPEN',
          createdBy: 'user-uid',
          createdByName: 'John Doe',
          assignedTo: null,
        })
      );
      expect(id).toBe('new-doc-id');
    });

    it('throws when db is null', async () => {
      // Override config mock for this test
      const configModule = require('../src/services/firebase/config');
      const originalDb = configModule.db;
      configModule.db = null;

      await expect(
        createIssue({ category: 'food', description: 'test', tableNumber: '1' }, 'uid', 'name')
      ).rejects.toThrow('Firebase not initialized');

      configModule.db = originalDb;
    });

    it('propagates Firestore errors', async () => {
      mockAddDoc.mockRejectedValue(new Error('Firestore write failed'));
      await expect(
        createIssue({ category: 'food', description: 'test', tableNumber: '1' }, 'uid', 'name')
      ).rejects.toThrow('Firestore write failed');
    });
  });

  describe('updateIssueStatus', () => {
    it('calls updateDoc with status and updatedAt', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);
      await updateIssueStatus('issue-123', 'IN_PROGRESS');

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ status: 'IN_PROGRESS' })
      );
    });

    it('propagates Firestore errors', async () => {
      mockUpdateDoc.mockRejectedValue(new Error('Permission denied'));
      await expect(updateIssueStatus('issue-123', 'RESOLVED')).rejects.toThrow('Permission denied');
    });

    it('throws when db is null', async () => {
      const configModule = require('../src/services/firebase/config');
      const originalDb = configModule.db;
      configModule.db = null;

      await expect(updateIssueStatus('issue-123', 'OPEN')).rejects.toThrow('Firebase not initialized');

      configModule.db = originalDb;
    });
  });

  describe('subscribeToIssues', () => {
    it('calls onSnapshot and returns unsubscribe function', () => {
      const unsubFn = jest.fn();
      mockOnSnapshot.mockReturnValue(unsubFn as any);

      const unsub = subscribeToIssues('manager', 'uid-1', jest.fn(), jest.fn());
      expect(mockOnSnapshot).toHaveBeenCalled();
      expect(unsub).toBe(unsubFn);
    });

    it('calls onUpdate with mapped issues from snapshot', () => {
      const onUpdate = jest.fn();
      const mockSnapshot = {
        forEach: (cb: Function) => {
          cb({
            id: 'doc-1',
            data: () => ({
              category: 'food',
              description: 'Test',
              tableNumber: '3',
              status: 'OPEN',
              createdBy: 'uid-1',
              createdByName: 'Alice',
              assignedTo: null,
              createdAt: 1234567890000,
              updatedAt: 1234567890000,
            }),
          });
        },
      };
      mockOnSnapshot.mockImplementation((_q, successCb: any) => {
        successCb(mockSnapshot);
        return jest.fn();
      });

      subscribeToIssues('manager', 'uid-1', onUpdate, jest.fn());
      expect(onUpdate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'doc-1', category: 'food', status: 'OPEN' }),
        ])
      );
    });

    it('calls onError when snapshot fails', () => {
      const onError = jest.fn();
      mockOnSnapshot.mockImplementation((_q, _success, errorCb: any) => {
        errorCb(new Error('Firestore error'));
        return jest.fn();
      });

      subscribeToIssues('waiter', 'uid-1', jest.fn(), onError);
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('returns no-op when db is null', () => {
      const configModule = require('../src/services/firebase/config');
      const originalDb = configModule.db;
      configModule.db = null;

      const onError = jest.fn();
      const unsub = subscribeToIssues('manager', 'uid-1', jest.fn(), onError);
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
      expect(typeof unsub).toBe('function');

      configModule.db = originalDb;
    });

    it('waiter query adds createdBy constraint', () => {
      const { where } = require('firebase/firestore');
      mockOnSnapshot.mockReturnValue(jest.fn() as any);
      subscribeToIssues('waiter', 'waiter-uid', jest.fn(), jest.fn());
      expect(where).toHaveBeenCalledWith('createdBy', '==', 'waiter-uid');
    });

    it('chef query filters by food category', () => {
      const { where } = require('firebase/firestore');
      mockOnSnapshot.mockReturnValue(jest.fn() as any);
      subscribeToIssues('chef', 'chef-uid', jest.fn(), jest.fn());
      expect(where).toHaveBeenCalledWith('category', '==', 'food');
    });

    it('supervisor query filters by service and hygiene', () => {
      const { where } = require('firebase/firestore');
      mockOnSnapshot.mockReturnValue(jest.fn() as any);
      subscribeToIssues('supervisor', 'sup-uid', jest.fn(), jest.fn());
      expect(where).toHaveBeenCalledWith('category', 'in', ['service', 'hygiene']);
    });

    it('manager query adds no extra constraints', () => {
      const { where } = require('firebase/firestore');
      (where as jest.Mock).mockClear();
      mockOnSnapshot.mockReturnValue(jest.fn() as any);
      subscribeToIssues('manager', 'mgr-uid', jest.fn(), jest.fn());
      expect(where).not.toHaveBeenCalled();
    });
  });
});
