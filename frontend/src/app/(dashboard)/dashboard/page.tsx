'use client';

import { useState } from 'react';
import {
  TrendingUp, TrendingDown, Clock, AlertTriangle, ArrowRightLeft,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip as PieTooltip,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboard } from '@/hooks/useDashboard';
import { cn } from '@/lib/utils';
import type { DashboardSummary } from '@/types';

// ── Sabitler ──────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  OFFICE: 'Ofis', SOFTWARE: 'Yazılım', FOOD: 'Yemek',
  TRANSPORT: 'Ulaşım', UTILITY: 'Fatura', OTHER: 'Diğer',
};
const PIE_COLORS = ['#4F46E5', '#7C3AED', '#DB2777', '#DC2626', '#D97706', '#059669'];

// ── Yardımcılar ───────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  '₺ ' + Math.abs(n ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const fmtFull = (n: number) =>
  '₺ ' + Number(n ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 });

const fmtTooltip = (v: unknown) =>
  '₺ ' + Number(v ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 });

// ── Dönem seçici ──────────────────────────────────────────────────────────────

const CHART_PERIODS = [
  { value: 3,  label: 'Son 3 Ay' },
  { value: 6,  label: 'Son 6 Ay' },
  { value: 12, label: 'Son 12 Ay' },
];
const CATEGORY_PERIODS = [
  { value: 1,  label: 'Bu Ay' },
  { value: 3,  label: 'Son 3 Ay' },
  { value: 6,  label: 'Son 6 Ay' },
  { value: 12, label: 'Son 12 Ay' },
  { value: 0,  label: 'Tüm Zamanlar' },
];

function PeriodTabs({
  value,
  options,
  onChange,
}: {
  value: number;
  options: { value: number; label: string }[];
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
            value === o.value
              ? 'bg-primary/15 text-primary font-medium'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── KPI kart yapılandırması ───────────────────────────────────────────────────

function buildKpiCards(data: DashboardSummary) {
  return [
    {
      label: 'Toplam Gelir',
      value: fmt(data.totalRevenue),
      sub: 'Tahsil edilen faturalar',
      icon: TrendingUp,
      color: 'text-green-400',
      accent: 'border-l-2 border-l-green-500/40',
    },
    {
      label: 'Toplam Gider',
      value: fmt(data.totalExpenses),
      sub: 'Ödenen giderler',
      icon: TrendingDown,
      color: 'text-red-400',
      accent: 'border-l-2 border-l-red-500/40',
    },
    {
      label: 'Bekleyen Ödemeler',
      value: fmt(data.pendingPayables),
      sub: `${data.pendingCount} gider`,
      icon: Clock,
      color: 'text-yellow-400',
      accent: 'border-l-2 border-l-yellow-500/40',
    },
    {
      label: 'Vadesi Geçmiş',
      value: fmt(data.overdueAmount),
      sub: `${data.overdueCount} alacak`,
      icon: AlertTriangle,
      color: 'text-destructive',
      accent: 'border-l-2 border-l-destructive/40',
    },
  ];
}

// ── Sayfa ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [chartMonths, setChartMonths] = useState(6);
  const [categoryMonths, setCategoryMonths] = useState(6);

  const { summary, summaryLoading, chartData, categoryData } = useDashboard(chartMonths, categoryMonths);

  const cashFlowPositive = (summary?.cashFlow ?? 0) >= 0;
  const kpiCards = summary ? buildKpiCards(summary) : null;

  const pieData = categoryData
    .filter((e) => e.total > 0)
    .map((e) => ({ name: CATEGORY_LABELS[e.category] ?? e.category, value: e.total }));

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* KPI kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {summaryLoading || !kpiCards
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                </CardHeader>
                <CardContent>
                  <div className="h-7 w-28 bg-muted rounded animate-pulse mb-2" />
                  <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                </CardContent>
              </Card>
            ))
          : kpiCards.map((kpi) => (
              <Card key={kpi.label} className={kpi.accent}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {kpi.label}
                  </CardTitle>
                  <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                  <p className={`text-xs mt-1 ${kpi.color}`}>{kpi.sub}</p>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Nakit Akışı Özeti */}
      {summary && (
        <Card
          className={cn(
            'mb-8 border',
            cashFlowPositive
              ? 'border-green-500/20 bg-green-500/5'
              : 'border-red-500/20 bg-red-500/5',
          )}
        >
          <CardContent className="py-4 flex items-center gap-4">
            <div
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-full shrink-0',
                cashFlowPositive ? 'bg-green-500/15' : 'bg-red-500/15',
              )}
            >
              <ArrowRightLeft
                className={cn('w-5 h-5', cashFlowPositive ? 'text-green-400' : 'text-red-400')}
              />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Nakit Akışı Özeti
              </p>
              <p
                className={cn(
                  'text-xl font-bold mt-0.5',
                  cashFlowPositive ? 'text-green-400' : 'text-red-400',
                )}
              >
                {cashFlowPositive ? '+' : '-'}{fmtFull(Math.abs(summary.cashFlow))}
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-8 text-sm">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Gelir</p>
                <p className="font-semibold text-green-400">{fmtFull(summary.totalRevenue)}</p>
              </div>
              <span className="text-muted-foreground text-lg">−</span>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Gider</p>
                <p className="font-semibold text-red-400">{fmtFull(summary.totalExpenses)}</p>
              </div>
              <span className="text-muted-foreground text-lg">=</span>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Net</p>
                <p className={cn('font-semibold', cashFlowPositive ? 'text-green-400' : 'text-red-400')}>
                  {cashFlowPositive ? '+' : '-'}{fmtFull(Math.abs(summary.cashFlow))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grafikler */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Aylık Gelir / Gider */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Aylık Gelir / Gider
              </CardTitle>
              <PeriodTabs
                value={chartMonths}
                options={CHART_PERIODS}
                onChange={setChartMonths}
              />
            </div>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-muted-foreground text-sm opacity-50">
                Henüz veri yok
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} barGap={4} barCategoryGap="30%">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) =>
                      '₺' + (v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v)
                    }
                    width={55}
                  />
                  <Tooltip
                    formatter={(v) => fmtTooltip(v)}
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      fontSize: 12,
                      color: 'hsl(var(--foreground))',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                    itemStyle={{ color: 'hsl(var(--muted-foreground))' }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                    formatter={(value) => (
                      <span style={{ color: 'hsl(var(--muted-foreground))' }}>{value}</span>
                    )}
                  />
                  <Bar dataKey="gelir" name="Gelir" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="gider" name="Gider" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Gider Kategorileri */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingDown className="w-4 h-4" />
                Gider Kategorileri
              </CardTitle>
              <PeriodTabs
                value={categoryMonths}
                options={CATEGORY_PERIODS}
                onChange={setCategoryMonths}
              />
            </div>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-muted-foreground text-sm opacity-50">
                Henüz gider yok
              </div>
            ) : (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <PieTooltip
                      formatter={(v) => fmtTooltip(v)}
                      contentStyle={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 8,
                        fontSize: 12,
                        color: 'hsl(var(--foreground))',
                      }}
                      itemStyle={{ color: 'hsl(var(--muted-foreground))' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {pieData.map((entry, i) => (
                    <div key={entry.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                        />
                        <span className="text-muted-foreground">{entry.name}</span>
                      </div>
                      <span className="font-medium text-foreground tabular-nums">
                        {fmtTooltip(entry.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
