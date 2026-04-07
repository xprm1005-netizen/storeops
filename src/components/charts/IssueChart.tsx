import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
} from 'recharts';
import { ChartCard } from './ChartCard';
import type { IssueByCategory } from '@/services/analytics.service';

interface Props {
  data: IssueByCategory[];
}

export function IssueChart({ data }: Props) {
  const total = data.reduce((s, d) => s + d.count, 0);

  if (total === 0) {
    return (
      <ChartCard title="이슈 유형 TOP 5" subtitle="지난 30일">
        <div className="h-40 flex items-center justify-center text-sm text-gray-400">
          발생한 이슈가 없습니다 👍
        </div>
      </ChartCard>
    );
  }

  return (
    <ChartCard title="이슈 유형 TOP 5" subtitle={`지난 30일 · 총 ${total}건`}>
      <div className="flex items-center gap-4">
        <div className="w-[140px] h-[140px] relative flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="category"
                innerRadius={42}
                outerRadius={68}
                paddingAngle={2}
                strokeWidth={0}
              >
                {data.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid #E5E7EB',
                  fontSize: 13,
                  fontWeight: 600,
                }}
                formatter={(v: number) => [`${v}건`, '']}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-black text-gray-900">{total}</span>
            <span className="text-[10px] text-gray-400 font-semibold">TOTAL</span>
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          {data.map((d, idx) => {
            const pct = Math.round((d.count / total) * 100);
            return (
              <div key={idx} className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: d.color }}
                />
                <span className="text-xs font-semibold text-gray-700 flex-1 truncate">
                  {d.category}
                </span>
                <span className="text-xs font-bold text-gray-900">{d.count}</span>
                <span className="text-[11px] text-gray-400 w-8 text-right">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </ChartCard>
  );
}
