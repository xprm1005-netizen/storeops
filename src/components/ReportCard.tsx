import { Report } from '@/types';
import { ProgressBar } from './ui/ProgressBar';
import { cn } from '@/lib/cn';

interface Props {
  report: Report;
  onClick?: () => void;
}

export function ReportCard({ report, onClick }: Props) {
  const rate = report.total_count > 0 ? Math.round((report.ok_count / report.total_count) * 100) : 0;
  const lowRate = rate < 90;
  return (
    <button onClick={onClick}
      className="w-full text-left bg-white rounded-2xl p-5 border border-gray-100 shadow-sm active:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-base font-bold text-gray-900">{report.task_name}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {report.performer_name} · {report.duration_min}분
          </p>
        </div>
        {lowRate && <span className="text-warning-500 text-lg">⚠️</span>}
      </div>
      <ProgressBar value={rate} color={lowRate ? 'primary' : 'success'} />
      <div className="flex items-center justify-between mt-3 text-xs">
        <span className={cn('font-bold', lowRate ? 'text-warning-600' : 'text-success-600')}>{rate}%</span>
        <span className="text-gray-400">정상 {report.ok_count} · 이상 {report.anomaly_count}</span>
      </div>
    </button>
  );
}
