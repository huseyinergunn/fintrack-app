import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => (
    <div className="w-full">
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
          error && 'border-destructive focus:ring-destructive',
          className
        )}
        ref={ref}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  )
);
Input.displayName = 'Input';

export { Input };
