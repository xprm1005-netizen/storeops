import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { issuesService } from '@/services/issues.service';
import { supabase } from '@/services/supabase';
import { analyticsService, DashboardData } from '@/services/analytics.service';
import { BottomNav } from '@/components/BottomNav';
import { KpiCard } from '@/components/charts/KpiCard';
import { CompletionChart } from '@/components/charts/CompletionChart';
import { EmployeeChart } from '@/components/charts/EmployeeChart';
import { IssueChart } from '@/components/charts/IssueChart';
import type { Issue } from '@/types';
import { cn } from '@/lib/cn';

export function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [data, setData] = useState<DashboardData | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const storeId = user?.storeId ?? null;
        const [dashData, openIssues] = await Promise.all([
          analyticsService.loadDashboard(storeId),
          storeId ? issuesService.listOpen(storeId) : Promise.resolve([] as Issue[]),
        ]);
        if (!cancelled) {
          setData(dashData);
          setIssues(openIssues);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [user?.storeId]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate('/login');
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">대시보드 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('ko-KR', { weekday: 'short' });
  const { kpi, weekly, employees, issueByCategory, isDummy } = data;

  return (
    <div className="min-h-full pb-24">
      <header className="px-4 pt-6 pb-4 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {user?.storeName ?? '대시보드'}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {user?.name}님 · {new Date().toLocaleDateString('ko-KR')} ({today})
          </p>
        </div>
        <button onClick={handleSignOut} className="text-xs text-gray-400 font-semibold px-2 py-1">
          로그아웃
        </button>
      </header>

      {isDummy && (
        <div className="mx-4 mb-4 p-3 rounded-xl bg-primary-50 border border-primary-100 text-xs text-primary-700">
          💡 아직 데이터가 없어 샘플로 표시 중입니다. 점검이 완료되면 실제 통계로 바뀝니다.
        </div>
      )}

      <div className="px-4 mb-4">
        <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl p-6 text-white">
          <p className="text-sm font-semibold opacity-80 mb-1">오늘 수행률</p>
          <p className="text-5xl font-black mb-1">{kpi.todayCompletionRate}%</p>
          <p className="text-sm opacity-80">
            주간 평균 {kpi.weeklyAvgRate}% ·{' '}
            <span className={cn(kpi.todayCompletionRate >= kpi.weeklyAvgRate ? 'text-green-200' : 'text-amber-200')}>
              {kpi.todayCompletionRate >= kpi.weeklyAvgRate ? '▲' : '▼'}{' '}
              {Math.abs(kpi.todayCompletionRate - kpi.weeklyAvgRate)}%p
            </span>
          </p>
        </div>
      </div>

      <div className="px-4 mb-6 grid grid-cols-3 gap-3">
        <KpiCard icon="📋" tone="primary" label="오늘 미완료" value={kpi.todayPending} unit="건" />
        <KpiCard icon="⚠️" tone="danger"  label="미해결 이슈" value={kpi.openIssueCount} unit="건" />
        <KpiCard icon="📊" tone="success" label="주간 평균"   value={kpi.weeklyAvgRate}  unit="%" />
      </div>

      <div className="px-4 space-y-4">
        <CompletionChart data={weekly} />
        <EmployeeChart data={employees} />
        <IssueChart data={issueByCategory} />
      </div>

      <section className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-700">미해결 이슈</h2>
          <span className="text-sm font-bold text-danger-600">{issues.length}</span>
        </div>
        <div className="space-y-3">
          {issues.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">미해결 이슈가 없어요 👍</p>
          ) : issues.map((i) => (
            <div key={i.id} className={cn(
              'bg-white rounded-2xl p-4 border flex items-start gap-3',
              i.severity === 'urgent' ? 'border-danger-500' : 'border-gray-100'
            )}>
              <span className="text-xl">{i.severity === 'urgent' ? '🔴' : '🟡'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-gray-900 truncate">{i.title}</p>
                  {i.severity === 'urgent' && (
                    <span className="text-[10px] font-bold text-white bg-danger-500 px-1.5 py-0.5 rounded flex-shrink-0">긴급</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(i.created_at).toLocaleString('ko-KR')}
                </p>
                {i.description && <p className="text-sm text-gray-600 mt-1">{i.description}</p>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <BottomNav />
    </div>
  );
}
