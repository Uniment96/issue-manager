import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from './config';
import { Issue, CreateIssuePayload, IssueStatus, UserRole } from '../../types';
import { ISSUES_COLLECTION } from '../../constants';

function toIssue(id: string, data: Record<string, unknown>): Issue {
  return {
    id,
    category: data.category as Issue['category'],
    description: data.description as string,
    tableNumber: data.tableNumber as string,
    status: data.status as IssueStatus,
    createdBy: data.createdBy as string,
    createdByName: data.createdByName as string,
    assignedTo: data.assignedTo as string | undefined,
    createdAt:
      typeof (data.createdAt as any)?.toMillis === 'function'
        ? (data.createdAt as Timestamp).toMillis()
        : (data.createdAt as number) ?? Date.now(),
    updatedAt:
      typeof (data.updatedAt as any)?.toMillis === 'function'
        ? (data.updatedAt as Timestamp).toMillis()
        : (data.updatedAt as number) ?? Date.now(),
  };
}

function getRoleConstraints(role: UserRole, uid: string): QueryConstraint[] {
  switch (role) {
    case 'waiter':
      return [where('createdBy', '==', uid)];
    case 'chef':
      return [where('category', '==', 'food')];
    case 'supervisor':
      return [where('category', 'in', ['service', 'hygiene'])];
    case 'manager':
      return [];
    default:
      return [];
  }
}

export function subscribeToIssues(
  role: UserRole,
  uid: string,
  onUpdate: (issues: Issue[]) => void,
  onError: (err: Error) => void
): () => void {
  const constraints = getRoleConstraints(role, uid);
  const q = query(
    collection(db, ISSUES_COLLECTION),
    ...constraints,
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const issues: Issue[] = [];
      snapshot.forEach((docSnap) => {
        issues.push(toIssue(docSnap.id, docSnap.data() as Record<string, unknown>));
      });
      onUpdate(issues);
    },
    (err) => onError(err as Error)
  );
}

export async function createIssue(
  payload: CreateIssuePayload,
  uid: string,
  displayName: string
): Promise<string> {
  const ref = await addDoc(collection(db, ISSUES_COLLECTION), {
    ...payload,
    status: 'OPEN' as IssueStatus,
    createdBy: uid,
    createdByName: displayName,
    assignedTo: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateIssueStatus(id: string, status: IssueStatus): Promise<void> {
  await updateDoc(doc(db, ISSUES_COLLECTION, id), {
    status,
    updatedAt: serverTimestamp(),
  });
}
