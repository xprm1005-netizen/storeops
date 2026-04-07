import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { reportsService } from '@/services/reports.service';
import { Report } from '@/types';
import { ReportCard } from '@/components/ReportCard';
import { BottomNav } from '@/components/BottomNav';

export function ReportsPage() {
  const user = useAuthStore((s) => s.user);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user) return;
      setLoading(true);
      try {
        const data = await reportsService.listForStore(user.storeId);
        setReports(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const grouped = reports.reduce<Record<string, Report[]>>((acc, r) => {
    (acc[r.report_date] = acc[r.report_date] || []).push(r);
    return acc;
  }, {});

  const dates = Object.keys(grouped).sort().reverse();
  const today = new Date().toISOString().slice(0, 10);

  const formatDate = (d: string) => {
    const date = new Date(d);
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    return `${d} (${weekdays[date.getDay()]})${d === today ? ' 오늘' : ''}`;
  };

  return (
    <div className="min-h-full pb-20">
      <header className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-black text-gray-900">리포트</h1>
        <p className="text-sm text-gray-400 mt-0.5">완료된 점검 기록</p>
      </header>

      <div className="px-4 space-y-6">
        {loading ? (
          <p className="text-sm text-gray-400 text-center py-10">불러오는 중...</p>
        ) : dates.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">아직 리포트가 없어요</p>
        ) : dates.map((date) => (
          <section key={date}>
            <h2 className="text-sm font-bold text-gray-500 mb-3">{formatDate(date)}</h2>
            <div className="space-y-3">
              {grouped[date].map((r) => <ReportCard key={r.id} report={r} />)}
            </div>
          </section>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
