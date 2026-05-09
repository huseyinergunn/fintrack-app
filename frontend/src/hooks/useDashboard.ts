'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';
import type { DashboardSummary, ChartPoint, CategoryPoint } from '@/types';

interface DashboardAll {
  summary: DashboardSummary;
  chart: ChartPoint[];
  categories: CategoryPoint[];
}

export function useDashboard(chartMonths: number, categoryMonths: number) {
  const { data, isLoading: summaryLoading } = useQuery<DashboardAll>({
    queryKey: ['dashboard-all', chartMonths, categoryMonths],
    queryFn: () => dashboardApi.all(chartMonths, categoryMonths).then((r) => r.data),
  });

  return {
    summary: data?.summary,
    summaryLoading,
    chartData: data?.chart ?? [],
    categoryData: data?.categories ?? [],
  };
}
