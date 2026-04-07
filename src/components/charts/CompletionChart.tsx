import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts';
import { ChartCard } from './ChartCard';
import type { DailyCompletion } from '@/services/analytics.service';

interface Props {
  data: DailyCompletion[];
}

export function CompletionChart({ data }: Props) {
  const avg = data.length > 0
    ? Math.round(data.reduce((s, d) => s + d.rate, 0) / data.length)
    : 0;

  return (
    <ChartCard
      title="최근 7일 업무 수행률"
      subtitle={`평균 ${avg}% · 일별 완료율 추이`}
    >
      <div className="h-56 -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="#9CA3AF"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#9CA3AF"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
              ticks={[0, 50, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: '1px solid #E5E7EB',
                fontSize: 13,
                fontWeight: 600,
              }}
              formatter={(v: number) => [`${v}%`, '수행률']}
              labelStyle={{ color: '#6B7280', fontWeight: 500 }}
            />
            <ReferenceLine y={avg} stroke="#E5E7EB" strokeDasharray="4 4" />
            <Line
              type="monotone"
              dataKey="rate"
              stroke="#3B82F6"
              strokeWidth={3}
              dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
