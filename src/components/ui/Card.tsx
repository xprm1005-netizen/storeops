import { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('bg-white rounded-2xl p-5 border border-gray-100 shadow-sm', className)} {...props} />
  );
}
