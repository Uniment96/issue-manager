import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Issue, IssueCategory, IssueStatus } from '../types';

const CACHE_KEY = '@cached_issues';

interface IssueFilters {
  status: IssueStatus | 'ALL';
  category: IssueCategory | 'ALL';
  delayed: boolean;
}

interface IssueState {
  issues: Issue[];
  filters: IssueFilters;
  isLoading: boolean;
  error: string | null;

  setIssues: (issues: Issue[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: Partial<IssueFilters>) => void;
  addOptimisticIssue: (issue: Issue) => void;
  updateOptimisticIssue: (id: string, updates: Partial<Issue>) => void;
  loadCachedIssues: () => Promise<void>;
  getFilteredIssues: () => Issue[];
}

const DEFAULT_FILTERS: IssueFilters = {
  status: 'ALL',
  category: 'ALL',
  delayed: false,
};

const DELAY_THRESHOLD_MS = 10 * 60 * 1000;

export const useIssueStore = create<IssueState>((set, get) => ({
  issues: [],
  filters: DEFAULT_FILTERS,
  isLoading: false,
  error: null,

  setIssues: (issues) => {
    set({ issues });
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify(issues)).catch(() => null);
  },

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters } })),

  addOptimisticIssue: (issue) =>
    set((state) => ({ issues: [issue, ...state.issues] })),

  updateOptimisticIssue: (id, updates) =>
    set((state) => ({
      issues: state.issues.map((i) =>
        i.id === id ? { ...i, ...updates, updatedAt: Date.now() } : i
      ),
    })),

  loadCachedIssues: async () => {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw) as Issue[];
        set({ issues: cached });
      }
    } catch {
      // Ignore cache read errors
    }
  },

  getFilteredIssues: () => {
    const { issues, filters } = get();
    const now = Date.now();

    return issues.filter((issue) => {
      if (filters.status !== 'ALL' && issue.status !== filters.status) return false;
      if (filters.category !== 'ALL' && issue.category !== filters.category) return false;
      if (filters.delayed) {
        const isDelayed =
          issue.status !== 'RESOLVED' &&
          now - issue.createdAt > DELAY_THRESHOLD_MS;
        if (!isDelayed) return false;
      }
      return true;
    });
  },
}));
