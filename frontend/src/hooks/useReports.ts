'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';
import type { ReportData } from '@/types';

export function useReports(period: string) {
  const { data: report, isLoading } = useQuery<ReportData>({
    queryKey: ['report', period],
    queryFn: () => dashboardApi.report(period).then((r) => r.data),
  });

  return { report, isLoading };
}
