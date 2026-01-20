import { useNavigate } from 'react-router-dom';
import { HeaderWithMenu } from '@/components/header/HeaderWithMenu';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <HeaderWithMenu />
      <div className="flex flex-1 flex-col items-center justify-center p-6">
        <h1 className="mb-8 text-4xl font-bold tracking-tight">YAFA</h1>
        <button
          onClick={() => navigate('/plans')}
          className="rounded-[6px] bg-yafa px-8 py-4 text-base font-bold text-black shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          VIEW TRAINING PLANS
        </button>
      </div>
    </div>
  );
}
