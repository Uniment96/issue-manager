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
