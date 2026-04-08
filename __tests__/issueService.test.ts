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

// Use the manual mock — prevents real Firebase init in Node test environment
jest.mock('../src/services/firebase/config');

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
  // resetAllMocks clears both call history AND return value implementations,
  // preventing mock state from leaking between tests.
  jest.resetAllMocks();
  mockCollection.mockReturnValue({} as any);
  mockDoc.mockReturnValue({} as any);
  mockQuery.mockReturnValue({} as any);
  // serverTimestamp is defined in the jest.mock factory but reset by resetAllMocks —
  // restore it so each test sees a consistent sentinel value.
  const { serverTimestamp } = require('firebase/firestore');
  (serverTimestamp as jest.Mock).mockReturnValue({ _serverTimestamp: true });
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

    it('propagates Firestore errors', async () => {
      mockAddDoc.mockRejectedValue(new Error('Firestore write failed'));
      await expect(
        createIssue({ category: 'food', description: 'test', tableNumber: '1' }, 'uid', 'name')
      ).rejects.toThrow('Firestore write failed');
    });

    it('includes serverTimestamp fields', async () => {
      mockAddDoc.mockResolvedValue({ id: 'ts-doc' } as any);
      await createIssue({ category: 'service', description: 'slow', tableNumber: '2' }, 'uid', 'Jane');

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          createdAt: { _serverTimestamp: true },
          updatedAt: { _serverTimestamp: true },
        })
      );
    });
  });

  describe('updateIssueStatus', () => {
    it('calls updateDoc with status and updatedAt', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);
      await updateIssueStatus('issue-123', 'IN_PROGRESS');

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'IN_PROGRESS',
          updatedAt: { _serverTimestamp: true },
        })
      );
    });

    it('propagates Firestore errors', async () => {
      mockUpdateDoc.mockRejectedValue(new Error('Permission denied'));
      await expect(updateIssueStatus('issue-123', 'RESOLVED')).rejects.toThrow('Permission denied');
    });

    it('accepts all valid status values', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);
      await updateIssueStatus('issue-1', 'OPEN');
      await updateIssueStatus('issue-2', 'IN_PROGRESS');
      await updateIssueStatus('issue-3', 'RESOLVED');
      expect(mockUpdateDoc).toHaveBeenCalledTimes(3);
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

    it('maps Firestore Timestamp objects to milliseconds', () => {
      const onUpdate = jest.fn();
      const fakeTimestamp = { toMillis: () => 9999999 };
      const mockSnapshot = {
        forEach: (cb: Function) => {
          cb({
            id: 'doc-ts',
            data: () => ({
              category: 'hygiene',
              description: 'Dirty table',
              tableNumber: '4',
              status: 'OPEN',
              createdBy: 'uid-1',
              createdByName: 'Bob',
              assignedTo: null,
              createdAt: fakeTimestamp,
              updatedAt: fakeTimestamp,
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
          expect.objectContaining({ createdAt: 9999999, updatedAt: 9999999 }),
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
      mockOnSnapshot.mockReturnValue(jest.fn() as any);
      subscribeToIssues('manager', 'mgr-uid', jest.fn(), jest.fn());
      expect(where).not.toHaveBeenCalled();
    });
  });
});
