import { create } from 'zustand';
import { Dish, DishAction, DishFeedback, DishHealthScore, DishInsight } from '../types';
import { buildAllDishHealth, detectInsights } from '../utils/dishInsights';

interface DishState {
  dishes: Dish[];
  feedback: DishFeedback[];
  actions: DishAction[];
  isLoading: boolean;

  setDishes: (dishes: Dish[]) => void;
  setFeedback: (feedback: DishFeedback[]) => void;
  setActions: (actions: DishAction[]) => void;
  setLoading: (loading: boolean) => void;

  /** Computed health scores for all active dishes */
  getDishHealthScores: () => DishHealthScore[];

  /** Computed insights across all dishes */
  getInsights: () => DishInsight[];

  /** Feedback for a specific dish */
  getFeedbackForDish: (dishId: string) => DishFeedback[];

  /** Actions for a specific dish */
  getActionsForDish: (dishId: string) => DishAction[];

  /** Live feed: last 20 feedback items across all dishes */
  getLiveFeed: () => DishFeedback[];

  /** Low-rated feedback (rating ≤ 2) requiring attention */
  getCriticalFeedback: () => DishFeedback[];
}

export const useDishStore = create<DishState>((set, get) => ({
  dishes: [],
  feedback: [],
  actions: [],
  isLoading: false,

  setDishes: (dishes) => set({ dishes }),
  setFeedback: (feedback) => set({ feedback }),
  setActions: (actions) => set({ actions }),
  setLoading: (isLoading) => set({ isLoading }),

  getDishHealthScores: () => {
    const { dishes, feedback } = get();
    return buildAllDishHealth(dishes, feedback);
  },

  getInsights: () => {
    const { feedback } = get();
    const healthScores = get().getDishHealthScores();
    return detectInsights(healthScores, feedback);
  },

  getFeedbackForDish: (dishId) => {
    return get().feedback.filter((fb) => fb.dishId === dishId);
  },

  getActionsForDish: (dishId) => {
    return get().actions.filter((a) => a.dishId === dishId);
  },

  getLiveFeed: () => {
    return [...get().feedback]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 20);
  },

  getCriticalFeedback: () => {
    return get().feedback
      .filter((fb) => fb.rating <= 2)
      .sort((a, b) => b.createdAt - a.createdAt);
  },
}));
