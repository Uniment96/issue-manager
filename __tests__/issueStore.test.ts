import { useIssueStore } from '../src/store/issueStore';
import { Issue } from '../src/types';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn(),
}));

const AsyncStorage = require('@react-native-async-storage/async-storage');

const makeIssue = (overrides: Partial<Issue> = {}): Issue => ({
  id: 'issue-1',
  category: 'food',
  description: 'Test issue',
  tableNumber: '5',
  status: 'OPEN',
  createdBy: 'user-1',
  createdByName: 'Test User',
  createdAt: Date.now() - 5000,
  updatedAt: Date.now() - 5000,
  ...overrides,
});

beforeEach(() => {
  useIssueStore.setState({
    issues: [],
    isLoading: false,
    error: null,
    filters: { status: 'ALL', category: 'ALL', delayed: false },
  });
  jest.clearAllMocks();
});

describe('issueStore', () => {
  describe('setIssues', () => {
    it('replaces issues array', () => {
      const issues = [makeIssue(), makeIssue({ id: 'issue-2' })];
      useIssueStore.getState().setIssues(issues);
      expect(useIssueStore.getState().issues).toHaveLength(2);
    });

    it('persists to AsyncStorage', () => {
      const issues = [makeIssue()];
      useIssueStore.getState().setIssues(issues);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@cached_issues',
        JSON.stringify(issues)
      );
    });
  });

  describe('setLoading', () => {
    it('updates isLoading', () => {
      useIssueStore.getState().setLoading(true);
      expect(useIssueStore.getState().isLoading).toBe(true);
      useIssueStore.getState().setLoading(false);
      expect(useIssueStore.getState().isLoading).toBe(false);
    });
  });

  describe('setError', () => {
    it('sets error message', () => {
      useIssueStore.getState().setError('Something went wrong');
      expect(useIssueStore.getState().error).toBe('Something went wrong');
    });

    it('clears error with null', () => {
      useIssueStore.setState({ error: 'old error' });
      useIssueStore.getState().setError(null);
      expect(useIssueStore.getState().error).toBeNull();
    });
  });

  describe('setFilters', () => {
    it('merges partial filter update', () => {
      useIssueStore.getState().setFilters({ status: 'OPEN' });
      const { filters } = useIssueStore.getState();
      expect(filters.status).toBe('OPEN');
      expect(filters.category).toBe('ALL'); // unchanged
      expect(filters.delayed).toBe(false); // unchanged
    });
  });

  describe('addOptimisticIssue', () => {
    it('prepends issue to front of list', () => {
      const existing = makeIssue({ id: 'existing' });
      useIssueStore.setState({ issues: [existing] });
      const newIssue = makeIssue({ id: 'new' });
      useIssueStore.getState().addOptimisticIssue(newIssue);

      const { issues } = useIssueStore.getState();
      expect(issues[0].id).toBe('new');
      expect(issues[1].id).toBe('existing');
    });
  });

  describe('updateOptimisticIssue', () => {
    it('applies partial updates to matching issue', () => {
      useIssueStore.setState({ issues: [makeIssue({ id: 'issue-1', status: 'OPEN' })] });
      useIssueStore.getState().updateOptimisticIssue('issue-1', { status: 'IN_PROGRESS' });

      const issue = useIssueStore.getState().issues.find((i) => i.id === 'issue-1');
      expect(issue?.status).toBe('IN_PROGRESS');
    });

    it('updates updatedAt timestamp', () => {
      const before = Date.now();
      useIssueStore.setState({ issues: [makeIssue({ id: 'issue-1', updatedAt: 0 })] });
      useIssueStore.getState().updateOptimisticIssue('issue-1', { status: 'RESOLVED' });

      const issue = useIssueStore.getState().issues.find((i) => i.id === 'issue-1');
      expect(issue?.updatedAt).toBeGreaterThanOrEqual(before);
    });

    it('does not modify other issues', () => {
      useIssueStore.setState({
        issues: [makeIssue({ id: 'issue-1' }), makeIssue({ id: 'issue-2', status: 'OPEN' })],
      });
      useIssueStore.getState().updateOptimisticIssue('issue-1', { status: 'RESOLVED' });

      const issue2 = useIssueStore.getState().issues.find((i) => i.id === 'issue-2');
      expect(issue2?.status).toBe('OPEN');
    });

    it('is a no-op for unknown id', () => {
      const issues = [makeIssue({ id: 'issue-1' })];
      useIssueStore.setState({ issues });
      useIssueStore.getState().updateOptimisticIssue('nonexistent', { status: 'RESOLVED' });
      expect(useIssueStore.getState().issues[0].status).toBe('OPEN');
    });
  });

  describe('loadCachedIssues', () => {
    it('loads and sets issues from AsyncStorage', async () => {
      const cached = [makeIssue({ id: 'cached-1' })];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(cached));
      await useIssueStore.getState().loadCachedIssues();
      expect(useIssueStore.getState().issues).toEqual(cached);
    });

    it('does nothing when cache is empty', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);
      await useIssueStore.getState().loadCachedIssues();
      expect(useIssueStore.getState().issues).toEqual([]);
    });

    it('swallows AsyncStorage errors silently', async () => {
      AsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));
      await expect(useIssueStore.getState().loadCachedIssues()).resolves.not.toThrow();
    });
  });

  describe('getFilteredIssues', () => {
    const now = Date.now();
    const recentIssue = makeIssue({ id: 'recent', status: 'OPEN', createdAt: now - 60_000 }); // 1 min old
    const delayedIssue = makeIssue({ id: 'delayed', status: 'OPEN', createdAt: now - 15 * 60_000 }); // 15 min old
    const inProgressIssue = makeIssue({ id: 'ip', status: 'IN_PROGRESS', category: 'service' });
    const resolvedIssue = makeIssue({ id: 'resolved', status: 'RESOLVED', category: 'hygiene' });

    beforeEach(() => {
      useIssueStore.setState({
        issues: [recentIssue, delayedIssue, inProgressIssue, resolvedIssue],
        filters: { status: 'ALL', category: 'ALL', delayed: false },
      });
    });

    it('returns all issues with default filters', () => {
      const result = useIssueStore.getState().getFilteredIssues();
      expect(result).toHaveLength(4);
    });

    it('filters by status', () => {
      useIssueStore.getState().setFilters({ status: 'OPEN' });
      const result = useIssueStore.getState().getFilteredIssues();
      expect(result.every((i) => i.status === 'OPEN')).toBe(true);
    });

    it('filters by category', () => {
      useIssueStore.getState().setFilters({ category: 'service' });
      const result = useIssueStore.getState().getFilteredIssues();
      expect(result.every((i) => i.category === 'service')).toBe(true);
    });

    it('filters by delayed (open issues older than 10 min)', () => {
      useIssueStore.getState().setFilters({ delayed: true });
      const result = useIssueStore.getState().getFilteredIssues();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('delayed');
    });

    it('combines status and category filters', () => {
      useIssueStore.getState().setFilters({ status: 'RESOLVED', category: 'hygiene' });
      const result = useIssueStore.getState().getFilteredIssues();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('resolved');
    });
  });
});
