import { useNavigate } from 'react-router-dom';
import { Task } from '@/types';
import { Button } from './ui/Button';
import { cn } from '@/lib/cn';

interface Props {
  task: Task;
  progress: { done: number; total: number; completed: boolean };
  isActiveNow: boolean;
  activatesAt?: string;
}

export function TaskCard({ task, progress, isActiveNow, activatesAt }: Props) {
  const navigate = useNavigate();
  const { done, total, completed } = progress;

  return (
    <div
      className={cn(
        'rounded-2xl p-5 bg-white transition-all',
        isActiveNow && !completed ? 'border-2 border-primary-500 shadow-md' : 'border border-gray-200',
        !isActiveNow && !completed && 'opacity-60'
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={cn(
          'w-2.5 h-2.5 rounded-full',
          completed ? 'bg-success-500' : isActiveNow ? 'bg-success-500 animate-pulse' : 'bg-gray-300'
        )} />
        <span className="text-xs font-semibold text-gray-500">
          {completed ? '완료됨' : isActiveNow ? '지금 할 일' : `${activatesAt ?? '이후'} 예정`}
        </span>
      </div>

      <h3 className="text-xl font-bold text-gray-900 mb-1">{task.name}</h3>
      <p className="text-sm text-gray-400 mb-4">
        {total}개 항목 · 예상 {task.estimated_minutes}분
        {done > 0 && !completed && <> · 진행 {done}/{total}</>}
      </p>

      {isActiveNow && !completed && (
        <Button variant="primary" size="lg" fullWidth onClick={() => navigate(`/crew/tasks/${task.id}`)}>
          {done > 0 ? '이어서 하기 →' : '시작하기 →'}
        </Button>
      )}
      {completed && (
        <div className="text-center text-sm text-success-600 font-semibold py-2">
          ✓ 사장님께 자동 보고됨
        </div>
      )}
    </div>
  );
}
