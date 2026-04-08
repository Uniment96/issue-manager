import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from './config';
import {
  Dish,
  DishAction,
  DishCategory,
  DishFeedback,
  DishIssueTag,
  ManagerActionStatus,
  ManagerActionType,
} from '../../types';
import {
  DISHES_COLLECTION,
  DISH_ACTIONS_COLLECTION,
  DISH_FEEDBACK_COLLECTION,
} from '../../constants';

// ─── Dishes ───────────────────────────────────────────────────────────────────

export function subscribeToDishes(callback: (dishes: Dish[]) => void): () => void {
  const q = query(
    collection(db, DISHES_COLLECTION),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, (snap) => {
    const dishes: Dish[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name,
        category: data.category as DishCategory,
        isActive: data.isActive ?? true,
        isUnderMonitoring: data.isUnderMonitoring ?? false,
        createdAt: (data.createdAt as Timestamp)?.toMillis?.() ?? Date.now(),
        updatedAt: (data.updatedAt as Timestamp)?.toMillis?.() ?? Date.now(),
      };
    });
    callback(dishes);
  });
}

export async function addDish(
  name: string,
  category: DishCategory
): Promise<string> {
  const ref = await addDoc(collection(db, DISHES_COLLECTION), {
    name: name.trim(),
    category,
    isActive: true,
    isUnderMonitoring: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function removeDish(dishId: string): Promise<void> {
  await updateDoc(doc(db, DISHES_COLLECTION, dishId), {
    isActive: false,
    updatedAt: serverTimestamp(),
  });
}

export async function setDishMonitoring(dishId: string, monitoring: boolean): Promise<void> {
  await updateDoc(doc(db, DISHES_COLLECTION, dishId), {
    isUnderMonitoring: monitoring,
    updatedAt: serverTimestamp(),
  });
}

// ─── Dish Feedback ────────────────────────────────────────────────────────────

export function subscribeToDishFeedback(
  callback: (feedback: DishFeedback[]) => void
): () => void {
  const q = query(
    collection(db, DISH_FEEDBACK_COLLECTION),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    const feedback: DishFeedback[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        dishId: data.dishId,
        dishName: data.dishName,
        rating: data.rating,
        issueTags: (data.issueTags ?? []) as DishIssueTag[],
        comment: data.comment ?? undefined,
        tableNumber: data.tableNumber,
        submittedBy: data.submittedBy,
        submittedByName: data.submittedByName,
        createdAt: (data.createdAt as Timestamp)?.toMillis?.() ?? Date.now(),
      };
    });
    callback(feedback);
  });
}

export interface SubmitFeedbackPayload {
  dishId: string;
  dishName: string;
  rating: number;
  issueTags: DishIssueTag[];
  comment?: string;
  tableNumber: string;
  submittedBy: string;
  submittedByName: string;
}

export async function submitDishFeedback(payload: SubmitFeedbackPayload): Promise<string> {
  const ref = await addDoc(collection(db, DISH_FEEDBACK_COLLECTION), {
    ...payload,
    comment: payload.comment ?? null,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

// ─── Dish Actions ─────────────────────────────────────────────────────────────

export function subscribeToDishActions(
  callback: (actions: DishAction[]) => void
): () => void {
  const q = query(
    collection(db, DISH_ACTIONS_COLLECTION),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    const actions: DishAction[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        dishId: data.dishId,
        dishName: data.dishName,
        actionType: data.actionType as ManagerActionType,
        reason: data.reason,
        status: data.status as ManagerActionStatus,
        createdBy: data.createdBy,
        createdByName: data.createdByName,
        createdAt: (data.createdAt as Timestamp)?.toMillis?.() ?? Date.now(),
        updatedAt: (data.updatedAt as Timestamp)?.toMillis?.() ?? Date.now(),
      };
    });
    callback(actions);
  });
}

export interface AddDishActionPayload {
  dishId: string;
  dishName: string;
  actionType: ManagerActionType;
  reason: string;
  createdBy: string;
  createdByName: string;
}

export async function addDishAction(payload: AddDishActionPayload): Promise<string> {
  const ref = await addDoc(collection(db, DISH_ACTIONS_COLLECTION), {
    ...payload,
    status: 'pending' as ManagerActionStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // If action is mark_monitoring, update the dish flag
  if (payload.actionType === 'mark_monitoring') {
    await setDishMonitoring(payload.dishId, true);
  }
  // If action is remove_dish, deactivate the dish
  if (payload.actionType === 'remove_dish') {
    await removeDish(payload.dishId);
  }

  return ref.id;
}

export async function updateDishActionStatus(
  actionId: string,
  status: ManagerActionStatus
): Promise<void> {
  await updateDoc(doc(db, DISH_ACTIONS_COLLECTION, actionId), {
    status,
    updatedAt: serverTimestamp(),
  });
}
