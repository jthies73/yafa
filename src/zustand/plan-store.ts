import { create } from 'zustand';
import { db } from '@/lib/db';
import type { Plan } from '@/types/domain';

interface PlanState {
  plans: Plan[];
  loading: boolean;
  fetchPlans: () => Promise<void>;
  createPlan: (name: string) => Promise<void>;
}

export const usePlanStore = create<PlanState>((set) => ({
  plans: [],
  loading: false,
  fetchPlans: async () => {
    set({ loading: true });
    try {
      const plans = await db.plans.toArray();
      set({ plans, loading: false });
    } catch (error) {
      console.error('Failed to fetch plans', error);
      set({ loading: false });
    }
  },
  createPlan: async (name: string) => {
    const newPlan: Plan = {
      id: crypto.randomUUID(),
      name,
      routines: [],
      createdAt: new Date().toISOString(),
    };
    try {
      await db.plans.add(newPlan);
      // Update local state to reflect the change immediately
      set((state) => ({ plans: [...state.plans, newPlan] }));
    } catch (error) {
      console.error('Failed to create plan', error);
    }
  },
}));
