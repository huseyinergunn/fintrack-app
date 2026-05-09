import { Injectable } from '@nestjs/common';
import { ExpenseStatus, InvoiceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const UNPAID_STATUSES = [ExpenseStatus.PENDING_APPROVAL, ExpenseStatus.APPROVED];

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getSummary(userId: string) {
    const today = new Date();

    const [
      paidInvoices,
      allExpenses,
      pendingExpenses,
      overdueInvoices,
    ] = await Promise.all([
      // Toplam gelir: tahsil edilen (PAID) faturalar
      this.prisma.invoice.aggregate({
        where: { userId, status: InvoiceStatus.PAID, isDeleted: false },
        _sum: { total: true },
      }),
      // Toplam gider: tüm silinmemiş giderler — pie chart ile aynı filtre
      this.prisma.expense.aggregate({
        where: { userId, isDeleted: false },
        _sum: { amount: true },
      }),
      // Bekleyen gider ödemeleri: PAID olmayan (PENDING_APPROVAL veya APPROVED)
      this.prisma.expense.findMany({
        where: { userId, isDeleted: false, status: { in: UNPAID_STATUSES } },
        select: { amount: true },
      }),
      // Vadesi geçmiş alacaklar: gönderilmiş/gecikmiş faturalar, dueDate geçmiş
      this.prisma.invoice.findMany({
        where: {
          userId,
          isDeleted: false,
          status: { in: [InvoiceStatus.SENT, InvoiceStatus.OVERDUE] },
          dueDate: { lt: today },
        },
        select: { total: true },
      }),
    ]);

    const totalRevenue = Number(paidInvoices._sum.total ?? 0);
    const totalExpensesAmount = Number(allExpenses._sum.amount ?? 0);
    const pendingAmount = pendingExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const overdueAmount = overdueInvoices.reduce((s, i) => s + (Number(i.total) || 0), 0);

    return {
      totalRevenue,
      totalExpenses: totalExpensesAmount,
      cashFlow: totalRevenue - totalExpensesAmount,
      pendingPayables: pendingAmount,
      pendingCount: pendingExpenses.length,
      overdueAmount,
      overdueCount: overdueInvoices.length,
    };
  }

  async getMonthlyChart(userId: string, months = 6) {
    const now = new Date();
    const since = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

    const [paidInvoices, expenses] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { userId, status: InvoiceStatus.PAID, paidAt: { gte: since }, isDeleted: false },
        select: { paidAt: true, total: true },
      }),
      this.prisma.expense.findMany({
        where: { userId, expenseDate: { gte: since }, isDeleted: false },
        select: { expenseDate: true, amount: true },
      }),
    ]);

    const buckets: Record<string, { label: string; gelir: number; gider: number }> = {};
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets[key] = {
        label: d.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' }),
        gelir: 0,
        gider: 0,
      };
    }

    for (const inv of paidInvoices) {
      if (!inv.paidAt) continue;
      const key = `${inv.paidAt.getFullYear()}-${String(inv.paidAt.getMonth() + 1).padStart(2, '0')}`;
      if (buckets[key]) buckets[key].gelir += Number(inv.total) || 0;
    }

    for (const exp of expenses) {
      const key = `${exp.expenseDate.getFullYear()}-${String(exp.expenseDate.getMonth() + 1).padStart(2, '0')}`;
      if (buckets[key]) buckets[key].gider += Number(exp.amount) || 0;
    }

    return Object.values(buckets);
  }

  async getReport(userId: string, period: string) {
    const since = this.getPeriodStart(period);
    const today = new Date();

    const [paidInvoices, expenses, pendingInvoices, pendingExpenses] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { userId, status: InvoiceStatus.PAID, paidAt: { gte: since }, isDeleted: false },
        select: { total: true, client: { select: { name: true } } },
      }),
      this.prisma.expense.findMany({
        where: { userId, expenseDate: { gte: since }, isDeleted: false },
        select: { amount: true, category: true },
      }),
      this.prisma.invoice.findMany({
        where: { userId, status: { in: [InvoiceStatus.SENT, InvoiceStatus.OVERDUE] }, isDeleted: false },
        select: { total: true, status: true, client: { select: { name: true } } },
      }),
      this.prisma.expense.findMany({
        where: { userId, status: { in: UNPAID_STATUSES }, isDeleted: false },
        select: { amount: true, dueDate: true },
      }),
    ]);

    const toNum = (v: unknown) => Number(v) || 0;

    const clientMap: Record<string, { clientName: string; total: number; count: number }> = {};
    for (const inv of paidInvoices) {
      const key = inv.client?.name ?? 'Anonim';
      if (!clientMap[key]) clientMap[key] = { clientName: key, total: 0, count: 0 };
      clientMap[key].total += toNum(inv.total);
      clientMap[key].count += 1;
    }

    const catMap: Record<string, number> = {};
    for (const exp of expenses) {
      catMap[exp.category] = (catMap[exp.category] ?? 0) + toNum(exp.amount);
    }

    const pendingClientMap: Record<string, { clientName: string; total: number; overdueCount: number }> = {};
    for (const inv of pendingInvoices) {
      const key = inv.client?.name ?? 'Anonim';
      if (!pendingClientMap[key]) pendingClientMap[key] = { clientName: key, total: 0, overdueCount: 0 };
      pendingClientMap[key].total += toNum(inv.total);
      if (inv.status === InvoiceStatus.OVERDUE) pendingClientMap[key].overdueCount += 1;
    }

    const totalRevenue = paidInvoices.reduce((s, i) => s + toNum(i.total), 0);
    const totalExpenses = expenses.reduce((s, e) => s + toNum(e.amount), 0);
    const overduePayables = pendingExpenses.filter((e) => e.dueDate && e.dueDate < today);

    return {
      period,
      revenue: totalRevenue,
      expenses: totalExpenses,
      net: totalRevenue - totalExpenses,
      revenueByClient: Object.values(clientMap).sort((a, b) => b.total - a.total),
      expensesByCategory: Object.entries(catMap)
        .map(([category, total]) => ({ category, total }))
        .sort((a, b) => b.total - a.total),
      pendingReceivables: {
        items: Object.values(pendingClientMap).sort((a, b) => b.total - a.total),
        total: pendingInvoices.reduce((s, i) => s + toNum(i.total), 0),
        count: pendingInvoices.length,
      },
      pendingPayables: {
        total: pendingExpenses.reduce((s, e) => s + toNum(e.amount), 0),
        count: pendingExpenses.length,
        overdueTotal: overduePayables.reduce((s, e) => s + toNum(e.amount), 0),
        overdueCount: overduePayables.length,
      },
    };
  }

  private getPeriodStart(period: string): Date {
    const now = new Date();
    switch (period) {
      case 'week': {
        const d = new Date(now);
        const day = d.getDay();
        d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
        d.setHours(0, 0, 0, 0);
        return d;
      }
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case '3m':
        return new Date(now.getFullYear(), now.getMonth() - 2, 1);
      case '6m':
        return new Date(now.getFullYear(), now.getMonth() - 5, 1);
      case 'year':
        return new Date(now.getFullYear(), 0, 1);
      default:
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }
  }

  async getAll(userId: string, chartMonths = 6, categoryMonths = 6) {
    const [summary, chart, categories] = await Promise.all([
      this.getSummary(userId),
      this.getMonthlyChart(userId, chartMonths),
      this.getExpensesByCategory(userId, categoryMonths),
    ]);
    return { summary, chart, categories };
  }

  async getExpensesByCategory(userId: string, months: number) {
    const where: Record<string, unknown> = { userId, isDeleted: false };
    if (months > 0) {
      const now = new Date();
      const since = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
      where.expenseDate = { gte: since };
    }

    const rows = await this.prisma.expense.groupBy({
      by: ['category'],
      where,
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
    });

    return rows.map((e) => ({
      category: e.category,
      total: Number(e._sum.amount ?? 0),
    }));
  }
}
