import { IssueCategory, IssueStatus, UserRole } from '../types';

export const COLORS = {
  // Status colors
  OPEN: '#e74c3c',        // Red
  IN_PROGRESS: '#f39c12', // Yellow/Amber
  RESOLVED: '#27ae60',    // Green

  // App palette
  primary: '#1a1a2e',
  primaryLight: '#16213e',
  accent: '#e94560',
  surface: '#ffffff',
  surfaceAlt: '#f8f9fa',
  border: '#e0e0e0',
  textPrimary: '#1a1a2e',
  textSecondary: '#6c757d',
  textLight: '#ffffff',
  error: '#e74c3c',
  warning: '#f39c12',
  success: '#27ae60',
  info: '#3498db',

  // Category colors
  food: '#e67e22',
  service: '#3498db',
  billing: '#9b59b6',
  hygiene: '#1abc9c',
} as const;

export const CATEGORY_CONFIG: Record<
  IssueCategory,
  { label: string; icon: string; color: string; emoji: string }
> = {
  food: { label: 'Food', icon: 'restaurant', color: COLORS.food, emoji: '🍽️' },
  service: { label: 'Service', icon: 'people', color: COLORS.service, emoji: '👤' },
  billing: { label: 'Billing', icon: 'receipt', color: COLORS.billing, emoji: '🧾' },
  hygiene: { label: 'Hygiene', icon: 'clean-hands', color: COLORS.hygiene, emoji: '🧹' },
};

export const STATUS_CONFIG: Record<
  IssueStatus,
  { label: string; color: string; nextStatus?: IssueStatus }
> = {
  OPEN: { label: 'Open', color: COLORS.OPEN, nextStatus: 'IN_PROGRESS' },
  IN_PROGRESS: { label: 'In Progress', color: COLORS.IN_PROGRESS, nextStatus: 'RESOLVED' },
  RESOLVED: { label: 'Resolved', color: COLORS.RESOLVED },
};

export const ROLE_CONFIG: Record<UserRole, { label: string; dashboardRoute: string }> = {
  waiter: { label: 'Waiter', dashboardRoute: '/(waiter)' },
  chef: { label: 'Chef', dashboardRoute: '/(chef)' },
  supervisor: { label: 'Supervisor', dashboardRoute: '/(supervisor)' },
  manager: { label: 'Manager', dashboardRoute: '/(manager)' },
};

export const DELAY_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

export const ISSUES_COLLECTION = 'issues';
export const USERS_COLLECTION = 'users';
