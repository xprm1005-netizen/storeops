import { cn } from '@/lib/cn';

type Tone = 'primary' | 'success' | 'warning' | 'danger';

interface Props {
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
  tone?: Tone;
  icon?: string;
}

const tones: Record<Tone, string> = {
  primary: 'bg-primary-50 text-primary-700',
  success: 'bg-success-50 text-success-600',
  warning: 'bg-warning-50 text-warning-600',
  danger:  'bg-danger-50 text-danger-600',
};

export function KpiCard({ label, value, unit, sub, tone = 'primary', icon }: Props) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-2">
        {icon && (
          <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-sm', tones[tone])}>
            {icon}
          </div>
        )}
        <p className="text-xs font-semibold text-gray-500 truncate">{label}</p>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-black text-gray-900">{value}</span>
        {unit && <span className="text-sm font-bold text-gray-500">{unit}</span>}
      </div>
      {sub && <p className="text-[11px] text-gray-400 mt-1 truncate">{sub}</p>}
    </div>
  );
}
