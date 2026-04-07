import { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'lg' | 'md' | 'sm';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700',
  secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
  danger: 'bg-danger-500 text-white hover:bg-danger-600',
  ghost: 'bg-transparent text-primary-600 hover:bg-primary-50',
};

const sizes: Record<Size, string> = {
  lg: 'h-14 px-6 text-[17px] rounded-2xl font-bold',
  md: 'h-12 px-5 text-[15px] rounded-xl font-semibold',
  sm: 'h-10 px-4 text-sm rounded-lg font-semibold',
};

export function Button({ variant = 'primary', size = 'md', fullWidth, loading, className, children, disabled, ...props }: Props) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 transition-colors active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {loading ? '처리 중...' : children}
    </button>
  );
}
