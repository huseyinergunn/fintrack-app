'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, FileText, CreditCard, Users, Trash2, LogOut, FileBarChart } from 'lucide-react';
import { authApi, dashboardApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/Logo';

type Summary = { overdueCount: number; pendingCount: number };

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { href: '/invoices', label: 'Satışlar', icon: FileText, badgeKey: 'overdue' as const },
  { href: '/expenses', label: 'Ödemeler', icon: CreditCard },
  { href: '/clients', label: 'Müşteriler', icon: Users },
  { href: '/reports', label: 'Raporlar', icon: FileBarChart },
  { href: '/trash', label: 'Çöp Kutusu', icon: Trash2 },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const { data: allData } = useQuery<{ summary: Summary }>({
    queryKey: ['dashboard-all', 6, 6],
    queryFn: () => dashboardApi.all(6, 6).then((r) => r.data),
  });
  const data = allData?.summary;

  const handleLogout = async () => {
    try { await authApi.logout(); } catch { /* cookie zaten silinir */ }
    router.push('/auth/login');
  };

  return (
    <aside className="w-60 border-r border-border bg-card flex flex-col shrink-0">
      <div className="flex justify-center items-center px-5 py-4 border-b border-border">
        <Logo height={96} />
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const badge =
            item.badgeKey === 'overdue' && data?.overdueCount
              ? data.overdueCount
              : null;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted',
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {badge && (
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors w-full"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Çıkış Yap
        </button>
      </div>
    </aside>
  );
}
