import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/cn';

const items = [
  { path: '/manager/dashboard', icon: '🏠', label: '홈' },
  { path: '/manager/reports', icon: '📋', label: '리포트' },
  { path: '/manager/staff', icon: '👥', label: '직원' },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 max-w-[480px] mx-auto">
      <div className="flex items-center justify-around h-16">
        {items.map((item) => {
          const active = location.pathname.startsWith(item.path);
          return (
            <button key={item.path} onClick={() => navigate(item.path)}
              className={cn('flex flex-col items-center gap-0.5 w-20', active ? 'text-primary-600' : 'text-gray-400')}>
              <span className="text-xl">{item.icon}</span>
              <span className="text-[11px] font-semibold">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
