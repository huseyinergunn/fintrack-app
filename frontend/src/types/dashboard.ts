export interface DashboardSummary {
  totalRevenue: number;
  totalExpenses: number;
  cashFlow: number;
  pendingPayables: number;
  pendingCount: number;
  overdueAmount: number;
  overdueCount: number;
}

export interface ChartPoint {
  label: string;
  gelir: number;
  gider: number;
}

export interface CategoryPoint {
  category: string;
  total: number;
}

export interface RevenueByClient {
  clientName: string;
  total: number;
  count: number;
}

export interface ExpenseByCategory {
  category: string;
  total: number;
}

export interface PendingReceivableItem {
  clientName: string;
  total: number;
  overdueCount: number;
}

export interface ReportData {
  period: string;
  revenue: number;
  expenses: number;
  net: number;
  revenueByClient: RevenueByClient[];
  expensesByCategory: ExpenseByCategory[];
  pendingReceivables: {
    items: PendingReceivableItem[];
    total: number;
    count: number;
  };
  pendingPayables: {
    total: number;
    count: number;
    overdueTotal: number;
    overdueCount: number;
  };
}
