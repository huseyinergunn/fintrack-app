import { cn } from '@/lib/utils';

type LogoProps = {
  className?: string;
  height?: number;
};

export function Logo({ className, height = 32 }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center', className)}>
      <img
        src="/logo/icon.svg"
        alt="fintrack"
        width={height}
        height={height}
        draggable={false}
        style={{ display: 'block' }}
      />
    </span>
  );
}
