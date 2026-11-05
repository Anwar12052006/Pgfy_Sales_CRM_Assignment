import type { ReactNode } from 'react';
import { cn } from '@/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
}

export function Card({ children, className, hoverable = false }: CardProps) {
  return (
    <div className={cn(hoverable ? 'card-hover' : 'card', 'p-6', className)}>
      {children}
    </div>
  );
}
