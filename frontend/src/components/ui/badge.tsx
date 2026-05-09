import { cn } from '@/lib/utils';

const variants = {
  draft:     'bg-muted text-muted-foreground border-border',
  sent:      'bg-blue-500/10 text-blue-400 border-blue-500/20',
  paid:      'bg-green-500/10 text-green-400 border-green-500/20',
  overdue:   'bg-destructive/10 text-destructive border-destructive/20',
  cancelled: 'bg-muted text-muted-foreground border-border opacity-60',
  pending:   'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
};

type BadgeVariant = keyof typeof variants;

export function Badge({
  variant,
  children,
  className,
}: {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
