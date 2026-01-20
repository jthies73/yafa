import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlanStore } from '@/zustand/plan-store';
import { HeaderWithMenu } from '@/components/header/HeaderWithMenu';

export default function PlansPage() {
  const { plans, fetchPlans, loading } = usePlanStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <HeaderWithMenu />
      <div className="flex-1 p-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Training Plans</h1>
          <button
            onClick={() => navigate('/plans/create')}
            className="rounded bg-primary px-4 py-2 text-primary-foreground shadow hover:bg-primary/90"
          >
            Create Plan
          </button>
        </div>

        {loading ? (
          <div>Loading...</div>
        ) : plans.length === 0 ? (
          <div className="text-muted-foreground">No plans found. Create one to get started.</div>
        ) : (
          <div className="grid gap-4">
            {plans.map((plan) => (
              <div key={plan.id} className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
                <h2 className="text-xl font-semibold">{plan.name}</h2>
                <p className="text-sm text-muted-foreground">
                  Created: {new Date(plan.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
