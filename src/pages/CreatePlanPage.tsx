import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlanStore } from '@/zustand/plan-store';
import { HeaderWithMenu } from '@/components/header/HeaderWithMenu';

export default function CreatePlanPage() {
  const [name, setName] = useState('');
  const createPlan = usePlanStore((state) => state.createPlan);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await createPlan(name);
    navigate('/plans');
  };

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <HeaderWithMenu />
      <div className="flex-1 p-4">
        <h1 className="mb-6 text-2xl font-bold">Create New Plan</h1>
        <form onSubmit={handleSubmit} className="max-w-md space-y-4">
          <div>
            <label htmlFor="planName" className="block text-sm font-medium mb-1">
              Plan Name
            </label>
            <input
              id="planName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border bg-input p-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="e.g. Push/Pull/Legs"
              autoFocus
            />
          </div>
          <div className="flex gap-4">
             <button
              type="submit"
              className="rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              disabled={!name.trim()}
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => navigate('/plans')}
              className="rounded border px-4 py-2 hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
