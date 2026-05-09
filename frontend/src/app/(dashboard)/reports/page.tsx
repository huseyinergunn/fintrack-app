'use client';

import { useState } from 'react';
import {
  TrendingUp, TrendingDown, ArrowRightLeft,
  Users, CreditCard, Clock, AlertTriangle, BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useReports } from '@/hooks/useReports';
import { cn } from '@/lib/utils';

// ── Sabitler ──────────────────────────────────────────────────────────────────

const PERIODS = [
  { value: 'week',  label: 'Bu Hafta' },
  { value: 'month', label: 'Bu Ay' },
  { value: '3m',    label: 'Son 3 Ay' },
  { value: '6m',    label: 'Son 6 Ay' },
  { value: 'year',  label: 'Bu Yıl' },
];

const CATEGORY_LABELS: Record<string, string> = {
  OFFICE: 'Ofis', SOFTWARE: 'Yazılım', FOOD: 'Yemek',
  TRANSPORT: 'Ulaşım', UTILITY: 'Fatura', OTHER: 'Diğer',
};

// ── Yardımcılar ───────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  '₺ ' + Number(n ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 });

const fmtShort = (n: number) =>
  '₺ ' + Math.abs(n ?? 0).toLocaleString('tr-TR', {
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  });

// ── Iskelet yükleniyor ────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="h-4 w-24 bg-muted rounded animate-pulse mb-3" />
        <div className="h-8 w-32 bg-muted rounded animate-pulse" />
      </CardContent>
    </Card>
  );
}

// ── Sayfa ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [period, setPeriod] = useState('month');
  const { report, isLoading } = useReports(period);

  const netPositive = (report?.net ?? 0) >= 0;
  const maxExpCat = Math.max(...(report?.expensesByCategory.map((e) => e.total) ?? [1]), 1);
  const maxRevClient = Math.max(...(report?.revenueByClient.map((c) => c.total) ?? [1]), 1);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Raporlar</h1>
        <p className="text-muted-foreground text-sm mt-1">Dönemsel gelir-gider analizi</p>
      </div>

      {/* Dönem seçici */}
      <div className="flex gap-1 mb-8 bg-muted/40 rounded-lg p-1 w-fit">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={cn(
              'px-4 py-1.5 text-sm rounded-md transition-colors font-medium',
              period === p.value
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {isLoading || !report ? (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <>
          {/* Özet KPI */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card className="border-l-2 border-l-green-500/40">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Tahsilat</CardTitle>
                <TrendingUp className="w-4 h-4 text-green-400" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-400">{fmtShort(report.revenue)}</p>
                <p className="text-xs text-muted-foreground mt-1">Ödenen faturalar</p>
              </CardContent>
            </Card>

            <Card className="border-l-2 border-l-red-500/40">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Harcama</CardTitle>
                <TrendingDown className="w-4 h-4 text-red-400" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-400">{fmtShort(report.expenses)}</p>
                <p className="text-xs text-muted-foreground mt-1">Tüm giderler</p>
              </CardContent>
            </Card>

            <Card className={cn('border-l-2', netPositive ? 'border-l-primary/40' : 'border-l-red-500/40')}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Net</CardTitle>
                <ArrowRightLeft
                  className={cn('w-4 h-4', netPositive ? 'text-primary' : 'text-red-400')}
                />
              </CardHeader>
              <CardContent>
                <p className={cn('text-2xl font-bold', netPositive ? 'text-primary' : 'text-red-400')}>
                  {netPositive ? '+' : '-'}{fmtShort(Math.abs(report.net))}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Tahsilat − Harcama</p>
              </CardContent>
            </Card>
          </div>

          {/* Detay tabloları */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* Müşteri bazlı gelir */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Müşteri Bazlı Gelir
                </CardTitle>
              </CardHeader>
              <CardContent>
                {report.revenueByClient.length === 0 ? (
                  <p className="text-sm text-muted-foreground opacity-50 text-center py-6">
                    Bu dönemde tahsilat yok
                  </p>
                ) : (
                  <div className="space-y-3">
                    {report.revenueByClient.map((c) => (
                      <div key={c.clientName}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-foreground">{c.clientName}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground text-xs">{c.count} fatura</span>
                            <span className="font-semibold text-green-400 tabular-nums">
                              {fmt(c.total)}
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-green-500/70 transition-all duration-500"
                            style={{ width: `${(c.total / maxRevClient) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Kategori bazlı gider */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Kategori Bazlı Gider
                </CardTitle>
              </CardHeader>
              <CardContent>
                {report.expensesByCategory.length === 0 ? (
                  <p className="text-sm text-muted-foreground opacity-50 text-center py-6">
                    Bu dönemde gider yok
                  </p>
                ) : (
                  <div className="space-y-3">
                    {report.expensesByCategory.map((e) => (
                      <div key={e.category}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-foreground">
                            {CATEGORY_LABELS[e.category] ?? e.category}
                          </span>
                          <span className="font-semibold text-red-400 tabular-nums">
                            {fmt(e.total)}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-red-500/70 transition-all duration-500"
                            style={{ width: `${(e.total / maxExpCat) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Bekleyen alacak & ödeme */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Bekleyen alacaklar */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Bekleyen Alacaklar
                  </CardTitle>
                  {report.pendingReceivables.count > 0 && (
                    <span className="text-xs font-semibold text-yellow-400">
                      {report.pendingReceivables.count} fatura · {fmt(report.pendingReceivables.total)}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {report.pendingReceivables.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground opacity-50 text-center py-4">
                    Bekleyen alacak yok
                  </p>
                ) : (
                  <div className="space-y-0">
                    {report.pendingReceivables.items.map((item) => (
                      <div
                        key={item.clientName}
                        className="flex items-center justify-between text-sm py-2.5 border-b border-border last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-foreground">{item.clientName}</span>
                          {item.overdueCount > 0 && (
                            <span className="flex items-center gap-1 text-xs text-red-400">
                              <AlertTriangle className="w-3 h-3" />
                              {item.overdueCount} vadesi geçti
                            </span>
                          )}
                        </div>
                        <span className="font-semibold text-yellow-400 tabular-nums">
                          {fmt(item.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bekleyen ödemeler */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Bekleyen Ödemeler
                  </CardTitle>
                  {report.pendingPayables.count > 0 && (
                    <span className="text-xs font-semibold text-orange-400">
                      {report.pendingPayables.count} ödeme · {fmt(report.pendingPayables.total)}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {report.pendingPayables.count === 0 ? (
                  <p className="text-sm text-muted-foreground opacity-50 text-center py-4">
                    Bekleyen ödeme yok
                  </p>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-border">
                      <span className="text-sm text-muted-foreground">Toplam bekleyen</span>
                      <span className="font-semibold text-foreground">
                        {fmt(report.pendingPayables.total)}
                      </span>
                    </div>
                    {report.pendingPayables.overdueCount > 0 && (
                      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-red-400">
                            {report.pendingPayables.overdueCount} ödemenin vadesi geçti
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {fmt(report.pendingPayables.overdueTotal)} hemen ödenmeyi bekliyor
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-muted-foreground">Zamanında bekleyen</span>
                      <span className="font-medium text-foreground">
                        {fmt(report.pendingPayables.total - report.pendingPayables.overdueTotal)}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
