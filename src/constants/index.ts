import { DishCategory, DishHealthStatus, DishIssueTag, IssueCategory, IssueStatus, ManagerActionType, UserRole } from '../types';

export const COLORS = {
  // Status colors
  OPEN: '#e74c3c',        // Red
  IN_PROGRESS: '#f59e0b', // Amber
  RESOLVED: '#22c55e',    // Green

  // App palette
  primary: '#3B82F6',
  primaryLight: '#2563EB',
  accent: '#2563EB',
  accentLight: '#EFF6FF',
  surface: '#ffffff',
  surfaceAlt: '#F8F9FA',
  border: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textLight: '#ffffff',
  error: '#ef4444',
  warning: '#f59e0b',
  success: '#22c55e',
  info: '#3B82F6',

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
export const DISHES_COLLECTION = 'dishes';
export const DISH_FEEDBACK_COLLECTION = 'dishFeedback';
export const DISH_ACTIONS_COLLECTION = 'dishActions';

export const DISH_CATEGORY_CONFIG: Record<DishCategory, { label: string; emoji: string }> = {
  starter: { label: 'Starter', emoji: '🥗' },
  main: { label: 'Main Course', emoji: '🍽️' },
  dessert: { label: 'Dessert', emoji: '🍰' },
  beverage: { label: 'Beverage', emoji: '🥤' },
  side: { label: 'Side', emoji: '🥔' },
};

export const DISH_ISSUE_TAG_CONFIG: Record<DishIssueTag, { label: string; emoji: string }> = {
  too_cold: { label: 'Too Cold', emoji: '🥶' },
  too_hot: { label: 'Too Hot', emoji: '🔥' },
  undercooked: { label: 'Undercooked', emoji: '🩸' },
  overcooked: { label: 'Overcooked', emoji: '🫠' },
  wrong_order: { label: 'Wrong Order', emoji: '❌' },
  portion_too_small: { label: 'Small Portion', emoji: '📏' },
  poor_presentation: { label: 'Poor Presentation', emoji: '🎨' },
  bad_taste: { label: 'Bad Taste', emoji: '😖' },
  long_wait: { label: 'Long Wait', emoji: '⏱️' },
  out_of_stock: { label: 'Out of Stock', emoji: '🚫' },
};

export const HEALTH_STATUS_CONFIG: Record<DishHealthStatus, { label: string; color: string; emoji: string; minScore: number }> = {
  top: { label: 'Top Performer', color: '#27ae60', emoji: '⭐', minScore: 80 },
  good: { label: 'Good', color: '#3498db', emoji: '👍', minScore: 60 },
  at_risk: { label: 'At Risk', color: '#f39c12', emoji: '⚠️', minScore: 40 },
  critical: { label: 'Critical', color: '#e74c3c', emoji: '🚨', minScore: 0 },
};

export const MANAGER_ACTION_CONFIG: Record<ManagerActionType, { label: string; emoji: string; color: string; description: string }> = {
  remove_dish: { label: 'Remove Dish', emoji: '🚫', color: '#e74c3c', description: 'Mark dish as inactive' },
  retrain_staff: { label: 'Retrain Staff', emoji: '📚', color: '#9b59b6', description: 'Schedule staff retraining' },
  flag_recipe: { label: 'Flag Recipe', emoji: '🚩', color: '#e67e22', description: 'Escalate recipe issue to kitchen' },
  mark_monitoring: { label: 'Monitor', emoji: '👁️', color: '#3498db', description: 'Place dish under monitoring' },
};
