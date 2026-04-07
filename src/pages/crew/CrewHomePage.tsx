import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/auth.service';
import { tasksService } from '@/services/tasks.service';
import { Task, TaskLog } from '@/types';
import { TaskCard } from '@/components/TaskCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';

type TaskWithProgress = {
  task: Task;
  progress: { done: number; total: number; completed: boolean };
  isActiveNow: boolean;
  activatesAt?: string;
};

function phaseActiveNow(phase: Task['phase']): boolean {
  const h = new Date().getHours();
  if (phase === 'opening') return h >= 6 && h < 14;
  if (phase === 'closing') return h >= 18 || h < 2;
  return true; // regular
}

export function CrewHomePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [items, setItems] = useState<TaskWithProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const tasks = await tasksService.listForStore(user.storeId);
      const withProgress = await Promise.all(
        tasks.map(async (task) => {
          const logs = await tasksService.getTodayLogs(task.id);
          const doneIds = new Set(logs.map((l) => l.item_id));
          const total = task.items.length;
          const done = task.items.filter((i) => doneIds.has(i.id)).length;
          return {
            task,
            progress: { done, total, completed: done === total && total > 0 },
            isActiveNow: phaseActiveNow(task.phase),
            activatesAt: task.phase === 'closing' ? '22:00' : task.phase === 'opening' ? '09:00' : undefined,
          } as TaskWithProgress;
        })
      );
      setItems(withProgress);
    } catch (e: any) {
      alert('불러오기 실패: ' + (e.message ?? 'error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user?.storeId]);

  const active = items.filter((i) => i.isActiveNow || i.progress.completed);
  const upcoming = items.filter((i) => !i.isActiveNow && !i.progress.completed);

  const allItems = items.reduce((sum, i) => sum + i.progress.total, 0);
  const doneItems = items.reduce((sum, i) => sum + i.progress.done, 0);
  const progressPct = allItems > 0 ? (doneItems / allItems) * 100 : 0;

  return (
    <div className="min-h-full pb-28">
      <header className="px-4 pt-6 pb-4 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">안녕하세요, {user?.name}님 👋</h1>
          <p className="text-sm text-gray-400 mt-0.5">{user?.storeName}</p>
        </div>
        <button onClick={async () => { await authService.signOut(); setUser(null); navigate('/login'); }}
          className="text-xs text-gray-400 font-semibold px-2 py-1">로그아웃</button>
      </header>

      <div className="px-4 mb-6">
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-600">오늘 진행률</span>
            <span className="text-sm font-bold text-gray-900">{doneItems}/{allItems}</span>
          </div>
          <ProgressBar value={progressPct} color="success" />
          <p className="text-xs text-gray-400 mt-2">
            {loading ? '불러오는 중...' : progressPct === 0 ? '오늘 아직 시작 전' : progressPct === 100 ? '모든 점검 완료! 🎉' : '잘 진행되고 있어요'}
          </p>
        </div>
      </div>

      {!loading && active.length > 0 && (
        <section className="px-4 mb-6">
          <h2 className="text-base font-bold text-gray-700 mb-3">지금 할 일</h2>
          <div className="space-y-3">
            {active.map((i) => <TaskCard key={i.task.id} {...i} />)}
          </div>
        </section>
      )}

      {!loading && upcoming.length > 0 && (
        <section className="px-4 mb-6">
          <h2 className="text-base font-bold text-gray-700 mb-3">다음 예정</h2>
          <div className="space-y-3">
            {upcoming.map((i) => <TaskCard key={i.task.id} {...i} />)}
          </div>
        </section>
      )}

      {!loading && items.length === 0 && (
        <div className="px-4 py-12 text-center text-gray-400 text-sm">
          배정된 점검이 없어요
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 max-w-[480px] mx-auto">
        <Button variant="danger" size="lg" fullWidth onClick={() => navigate('/crew/issues/new')}>
          + 특이사항 바로 보고
        </Button>
      </div>
    </div>
  );
}
