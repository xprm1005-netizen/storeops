import { supabase } from './supabase';

// =====================================================
// 타입
// =====================================================

export interface DailyCompletion {
  date: string;          // 'MM/DD' 표시용
  rate: number;          // 0-100
  ok: number;
  anomaly: number;
  total: number;
}

export interface EmployeePerformance {
  name: string;
  completionRate: number;   // 0-100
  itemCount: number;
}

export interface IssueByCategory {
  category: string;         // 한글 라벨
  count: number;
  color: string;
}

export interface DashboardKpi {
  todayCompletionRate: number;
  todayPending: number;
  openIssueCount: number;
  weeklyAvgRate: number;
}

export interface DashboardData {
  kpi: DashboardKpi;
  weekly: DailyCompletion[];
  employees: EmployeePerformance[];
  issueByCategory: IssueByCategory[];
  isDummy: boolean;
}

// =====================================================
// 카테고리 라벨 / 색상
// =====================================================

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  equipment:   { label: '기기 고장', color: '#3B82F6' },
  leak:        { label: '누수',      color: '#06B6D4' },
  cleanliness: { label: '청결',      color: '#10B981' },
  stock:       { label: '재고',      color: '#F59E0B' },
  safety:      { label: '안전',      color: '#EF4444' },
  etc:         { label: '기타',      color: '#6B7280' },
};

function formatMd(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function daysAgoDate(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// =====================================================
// 더미 데이터 (fallback)
// =====================================================

function dummyData(): DashboardData {
  const weekly: DailyCompletion[] = Array.from({ length: 7 }, (_, i) => {
    const d = daysAgoDate(6 - i);
    const total = 18 + Math.floor(Math.random() * 4);
    const ok = Math.floor(total * (0.82 + Math.random() * 0.15));
    const anomaly = Math.max(0, total - ok - Math.floor(Math.random() * 2));
    const rate = Math.round(((ok + anomaly) / total) * 100);
    return { date: formatMd(d), rate, ok, anomaly, total };
  });

  const employees: EmployeePerformance[] = [
    { name: '김지민', completionRate: 96, itemCount: 54 },
    { name: '이수현', completionRate: 88, itemCount: 48 },
    { name: '박준호', completionRate: 92, itemCount: 51 },
    { name: '최민영', completionRate: 100, itemCount: 36 },
  ];

  const issueByCategory: IssueByCategory[] = [
    { category: '기기 고장', count: 12, color: CATEGORY_META.equipment.color },
    { category: '청결',      count: 8,  color: CATEGORY_META.cleanliness.color },
    { category: '재고',      count: 6,  color: CATEGORY_META.stock.color },
    { category: '누수',      count: 4,  color: CATEGORY_META.leak.color },
    { category: '안전',      count: 2,  color: CATEGORY_META.safety.color },
  ];

  const today = weekly[weekly.length - 1];
  const kpi: DashboardKpi = {
    todayCompletionRate: today.rate,
    todayPending: Math.max(0, today.total - today.ok - today.anomaly),
    openIssueCount: 2,
    weeklyAvgRate: Math.round(weekly.reduce((s, d) => s + d.rate, 0) / weekly.length),
  };

  return { kpi, weekly, employees, issueByCategory, isDummy: true };
}

// =====================================================
// Supabase 조회
// =====================================================

async function fetchWeeklyCompletion(storeId: string): Promise<DailyCompletion[]> {
  const from = isoDate(daysAgoDate(6));
  const to = isoDate(new Date());

  // reports 테이블: ok_count, anomaly_count, total_count, report_date 컬럼 직접 사용
  const { data, error } = await supabase
    .from('reports')
    .select('report_date, ok_count, anomaly_count, total_count')
    .eq('store_id', storeId)
    .gte('report_date', from)
    .lte('report_date', to);
  if (error) throw error;

  // 날짜별 합산 (하루에 여러 리포트 가능)
  const byDate = new Map<string, { ok: number; anomaly: number; total: number }>();
  (data ?? []).forEach((r: any) => {
    const prev = byDate.get(r.report_date) ?? { ok: 0, anomaly: 0, total: 0 };
    prev.ok += r.ok_count ?? 0;
    prev.anomaly += r.anomaly_count ?? 0;
    prev.total += r.total_count ?? 0;
    byDate.set(r.report_date, prev);
  });

  const result: DailyCompletion[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = daysAgoDate(i);
    const key = isoDate(d);
    const agg = byDate.get(key) ?? { ok: 0, anomaly: 0, total: 0 };
    const rate = agg.total > 0 ? Math.round(((agg.ok + agg.anomaly) / agg.total) * 100) : 0;
    result.push({ date: formatMd(d), rate, ...agg });
  }
  return result;
}

async function fetchEmployeePerformance(storeId: string): Promise<EmployeePerformance[]> {
  // reports 테이블에서 performer별 집계 (지난 7일)
  const from = isoDate(daysAgoDate(6));

  const { data, error } = await supabase
    .from('reports')
    .select('performer_name, performer_id, ok_count, anomaly_count, total_count')
    .eq('store_id', storeId)
    .gte('report_date', from);
  if (error) throw error;

  const byUser = new Map<string, { name: string; ok: number; anomaly: number; total: number }>();
  (data ?? []).forEach((r: any) => {
    const key = r.performer_id ?? r.performer_name ?? 'unknown';
    const rec = byUser.get(key) ?? { name: r.performer_name ?? '알 수 없음', ok: 0, anomaly: 0, total: 0 };
    rec.ok += r.ok_count ?? 0;
    rec.anomaly += r.anomaly_count ?? 0;
    rec.total += r.total_count ?? 0;
    byUser.set(key, rec);
  });

  return Array.from(byUser.values())
    .map((u) => ({
      name: u.name,
      completionRate: u.total > 0 ? Math.round(((u.ok + u.anomaly) / u.total) * 100) : 0,
      itemCount: u.total,
    }))
    .filter((u) => u.itemCount > 0)
    .sort((a, b) => b.completionRate - a.completionRate);
}

async function fetchIssueByCategory(storeId: string): Promise<IssueByCategory[]> {
  const from = daysAgoDate(29).toISOString();

  const { data, error } = await supabase
    .from('issues')
    .select('category')
    .eq('store_id', storeId)
    .gte('created_at', from);
  if (error) throw error;

  const counts = new Map<string, number>();
  (data ?? []).forEach((i: any) => {
    counts.set(i.category, (counts.get(i.category) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([cat, count]) => ({
      category: CATEGORY_META[cat]?.label ?? cat,
      count,
      color: CATEGORY_META[cat]?.color ?? '#6B7280',
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

async function fetchKpi(
  storeId: string,
  weekly: DailyCompletion[]
): Promise<DashboardKpi> {
  const today = isoDate(new Date());

  // 오늘의 reports 합산
  const { data: todayRows } = await supabase
    .from('reports')
    .select('ok_count, anomaly_count, total_count')
    .eq('store_id', storeId)
    .eq('report_date', today);

  let ok = 0, anomaly = 0, total = 0;
  (todayRows ?? []).forEach((r: any) => {
    ok += r.ok_count ?? 0;
    anomaly += r.anomaly_count ?? 0;
    total += r.total_count ?? 0;
  });

  const done = ok + anomaly;
  const todayCompletionRate = total > 0 ? Math.round((done / total) * 100) : 0;
  const todayPending = Math.max(0, total - done);

  const { count: issueCount } = await supabase
    .from('issues')
    .select('*', { count: 'exact', head: true })
    .eq('store_id', storeId)
    .eq('status', 'open');

  const weeklyAvgRate =
    weekly.length > 0
      ? Math.round(weekly.reduce((s, d) => s + d.rate, 0) / weekly.length)
      : 0;

  return {
    todayCompletionRate,
    todayPending,
    openIssueCount: issueCount ?? 0,
    weeklyAvgRate,
  };
}

// =====================================================
// Public
// =====================================================

export const analyticsService = {
  async loadDashboard(storeId: string | null): Promise<DashboardData> {
    if (!storeId) return dummyData();

    try {
      const [weekly, employees, issueByCategory] = await Promise.all([
        fetchWeeklyCompletion(storeId),
        fetchEmployeePerformance(storeId),
        fetchIssueByCategory(storeId),
      ]);
      const kpi = await fetchKpi(storeId, weekly);

      const totallyEmpty =
        weekly.every((d) => d.total === 0) &&
        employees.length === 0 &&
        issueByCategory.length === 0;

      if (totallyEmpty) {
        return { ...dummyData(), isDummy: true };
      }

      return { kpi, weekly, employees, issueByCategory, isDummy: false };
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[analytics] falling back to dummy data:', e);
      return dummyData();
    }
  },
};
