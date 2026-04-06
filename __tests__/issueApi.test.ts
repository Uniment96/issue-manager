// Mock the api client before importing
jest.mock('../src/services/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

import { apiCreateIssue, apiUpdateIssue, apiFetchIssues } from '../src/services/api/issueApi';
import { Issue, IssueStatus } from '../src/types';

// Get references to the mock functions after the module has loaded
const { apiClient } = require('../src/services/api/client');
const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;
const mockPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>;
const mockPatch = apiClient.patch as jest.MockedFunction<typeof apiClient.patch>;

const makeIssue = (overrides: Partial<Issue> = {}): Issue => ({
  id: 'issue-1',
  category: 'food',
  description: 'Test',
  tableNumber: '5',
  status: 'OPEN',
  createdBy: 'uid-1',
  createdByName: 'Alice',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('issueApi', () => {
  describe('apiCreateIssue', () => {
    it('POSTs to /api/issues and returns issue', async () => {
      const created = makeIssue({ id: 'new-id' });
      mockPost.mockResolvedValue({ data: created });

      const result = await apiCreateIssue({
        category: 'food',
        description: 'Cold soup',
        tableNumber: '7',
      });

      expect(mockPost).toHaveBeenCalledWith('/api/issues', {
        category: 'food',
        description: 'Cold soup',
        tableNumber: '7',
      });
      expect(result).toEqual(created);
    });

    it('propagates network errors', async () => {
      mockPost.mockRejectedValue(new Error('Network Error'));
      await expect(
        apiCreateIssue({ category: 'food', description: 'test', tableNumber: '1' })
      ).rejects.toThrow('Network Error');
    });
  });

  describe('apiUpdateIssue', () => {
    it('PATCHes to /api/issues/:id with status', async () => {
      const updated = makeIssue({ status: 'RESOLVED' });
      mockPatch.mockResolvedValue({ data: updated });

      const result = await apiUpdateIssue('issue-1', 'RESOLVED');

      expect(mockPatch).toHaveBeenCalledWith('/api/issues/issue-1', { status: 'RESOLVED' });
      expect(result).toEqual(updated);
    });

    it('handles all valid statuses', async () => {
      const statuses: IssueStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED'];
      for (const status of statuses) {
        mockPatch.mockResolvedValue({ data: makeIssue({ status }) });
        const result = await apiUpdateIssue('issue-1', status);
        expect(result.status).toBe(status);
      }
    });

    it('propagates errors', async () => {
      mockPatch.mockRejectedValue(new Error('Server error'));
      await expect(apiUpdateIssue('issue-1', 'RESOLVED')).rejects.toThrow('Server error');
    });
  });

  describe('apiFetchIssues', () => {
    it('GETs /api/issues and returns array', async () => {
      const issues = [makeIssue(), makeIssue({ id: 'issue-2' })];
      mockGet.mockResolvedValue({ data: issues });

      const result = await apiFetchIssues();

      expect(mockGet).toHaveBeenCalledWith('/api/issues');
      expect(result).toHaveLength(2);
    });

    it('returns empty array when no issues', async () => {
      mockGet.mockResolvedValue({ data: [] });
      const result = await apiFetchIssues();
      expect(result).toEqual([]);
    });

    it('propagates errors', async () => {
      mockGet.mockRejectedValue(new Error('Unauthorized'));
      await expect(apiFetchIssues()).rejects.toThrow('Unauthorized');
    });
  });
});
