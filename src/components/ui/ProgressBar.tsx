import { cn } from '@/lib/cn';

interface Props {
  value: number;
  color?: 'primary' | 'success';
  className?: string;
}

export function ProgressBar({ value, color = 'primary', className }: Props) {
  const clamped = Math.max(0, Math.min(100, value));
  const fillColor = color === 'success' ? 'bg-success-500' : 'bg-primary-500';
  return (
    <div className={cn('w-full h-2.5 bg-gray-100 rounded-full overflow-hidden', className)}>
      <div className={cn('h-full transition-all duration-500', fillColor)} style={{ width: `${clamped}%` }} />
    </div>
  );
}
