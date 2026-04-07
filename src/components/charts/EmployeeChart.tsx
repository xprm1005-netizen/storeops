import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell,
} from 'recharts';
import { ChartCard } from './ChartCard';
import type { EmployeePerformance } from '@/services/analytics.service';

interface Props {
  data: EmployeePerformance[];
}

function barColor(rate: number): string {
  if (rate >= 95) return '#10B981'; // success
  if (rate >= 85) return '#3B82F6'; // primary
  if (rate >= 70) return '#F59E0B'; // warning
  return '#EF4444';                  // danger
}

export function EmployeeChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <ChartCard title="직원별 수행률" subtitle="지난 7일 기준">
        <div className="h-40 flex items-center justify-center text-sm text-gray-400">
          데이터가 없습니다
        </div>
      </ChartCard>
    );
  }

  return (
    <ChartCard title="직원별 수행률" subtitle={`지난 7일 · ${data.length}명`}>
      <div className="h-56 -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 24, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 100]}
              stroke="#9CA3AF"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke="#6B7280"
              fontSize={13}
              tickLine={false}
              axisLine={false}
              width={60}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: '1px solid #E5E7EB',
                fontSize: 13,
                fontWeight: 600,
              }}
              formatter={(v: number, _n, payload: any) => [
                `${v}% (${payload.payload.itemCount}건)`,
                '수행률',
              ]}
              cursor={{ fill: '#F9FAFB' }}
            />
            <Bar dataKey="completionRate" radius={[0, 8, 8, 0]}>
              {data.map((d, idx) => (
                <Cell key={idx} fill={barColor(d.completionRate)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
