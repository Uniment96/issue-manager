export type UserRole = 'waiter' | 'chef' | 'supervisor' | 'manager';

export type IssueCategory = 'food' | 'service' | 'billing' | 'hygiene';

export type IssueStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  fcmToken?: string;
}

export interface Issue {
  id: string;
  category: IssueCategory;
  description: string;
  tableNumber: string;
  status: IssueStatus;
  createdBy: string;
  createdByName: string;
  assignedTo?: string;
  createdAt: number; // Unix timestamp ms
  updatedAt: number;
  isOfflineCreated?: boolean;
}

export interface CreateIssuePayload {
  category: IssueCategory;
  description: string;
  tableNumber: string;
}

export interface UpdateIssuePayload {
  status: IssueStatus;
}

export type OfflineOperationType = 'CREATE_ISSUE' | 'UPDATE_ISSUE';

export interface OfflineOperation {
  id: string;
  type: OfflineOperationType;
  payload: CreateIssuePayload & { id?: string; status?: IssueStatus };
  createdAt: number;
  retryCount: number;
}

// ─── Dish Intelligence ────────────────────────────────────────────────────────

export type DishCategory = 'starter' | 'main' | 'dessert' | 'beverage' | 'side';

export interface Dish {
  id: string;
  name: string;
  category: DishCategory;
  isActive: boolean;
  isUnderMonitoring: boolean;
  createdAt: number;
  updatedAt: number;
}

export type DishIssueTag =
  | 'too_cold'
  | 'too_hot'
  | 'undercooked'
  | 'overcooked'
  | 'wrong_order'
  | 'portion_too_small'
  | 'poor_presentation'
  | 'bad_taste'
  | 'long_wait'
  | 'out_of_stock';

export interface DishFeedback {
  id: string;
  dishId: string;
  dishName: string;
  rating: number; // 1–5
  issueTags: DishIssueTag[];
  comment?: string;
  tableNumber: string;
  submittedBy: string;
  submittedByName: string;
  createdAt: number;
}

export type DishHealthStatus = 'top' | 'good' | 'at_risk' | 'critical';

export interface DishHealthScore {
  dishId: string;
  dishName: string;
  isActive: boolean;
  isUnderMonitoring: boolean;
  avgRating: number;
  feedbackCount: number;
  topIssueTag: DishIssueTag | null;
  trend: 'improving' | 'declining' | 'stable';
  healthScore: number; // 0–100
  healthStatus: DishHealthStatus;
  recentIssues: DishFeedback[]; // rating ≤ 2
}

export type ManagerActionType =
  | 'remove_dish'
  | 'retrain_staff'
  | 'flag_recipe'
  | 'mark_monitoring';

export type ManagerActionStatus = 'pending' | 'in_progress' | 'resolved';

export interface DishAction {
  id: string;
  dishId: string;
  dishName: string;
  actionType: ManagerActionType;
  reason: string;
  status: ManagerActionStatus;
  createdBy: string;
  createdByName: string;
  createdAt: number;
  updatedAt: number;
}

export interface DishInsight {
  type: 'repeated_issue' | 'declining' | 'improved' | 'no_feedback' | 'critical';
  dishName: string;
  message: string;
}
