import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  /** Size in pixels */
  size?: number;
  /** Additional CSS classes */
  className?: string;
}

export function LoadingSpinner({ size = 24, className = '' }: LoadingSpinnerProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Loader2
        size={size}
        className="animate-spin text-primary-600"
      />
    </div>
  );
}
