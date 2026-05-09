'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoicesApi, expensesApi } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import type { TrashedInvoice } from '@/types/invoice';
import type { TrashedExpense } from '@/types/expense';

export function useTrash() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: trashedInvoices = [], isLoading: loadingInv } = useQuery<TrashedInvoice[]>({
    queryKey: ['invoices-trash'],
    queryFn: () => invoicesApi.trash().then((r) => r.data),
  });

  const { data: trashedExpenses = [], isLoading: loadingExp } = useQuery<TrashedExpense[]>({
    queryKey: ['expenses-trash'],
    queryFn: () => expensesApi.trash().then((r) => r.data),
  });

  const restoreInvoice = useMutation({
    mutationFn: (id: string) => invoicesApi.restore(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices-trash'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
      qc.invalidateQueries({ queryKey: ['report'] });
      toast('Fatura geri yüklendi');
    },
    onError: () => toast('Geri yükleme başarısız', 'error'),
  });

  const hardDeleteInvoice = useMutation({
    mutationFn: (id: string) => invoicesApi.hardDelete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices-trash'] });
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
      qc.invalidateQueries({ queryKey: ['report'] });
      toast('Fatura kalıcı olarak silindi', 'info');
    },
    onError: () => toast('Silme işlemi başarısız', 'error'),
  });

  const restoreExpense = useMutation({
    mutationFn: (id: string) => expensesApi.restore(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses-trash'] });
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
      qc.invalidateQueries({ queryKey: ['report'] });
      toast('Gider geri yüklendi');
    },
    onError: () => toast('Geri yükleme başarısız', 'error'),
  });

  const hardDeleteExpense = useMutation({
    mutationFn: (id: string) => expensesApi.hardDelete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses-trash'] });
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
      qc.invalidateQueries({ queryKey: ['report'] });
      toast('Gider kalıcı olarak silindi', 'info');
    },
    onError: () => toast('Silme işlemi başarısız', 'error'),
  });

  return {
    trashedInvoices,
    loadingInv,
    trashedExpenses,
    loadingExp,
    restoreInvoice: (id: string) => restoreInvoice.mutate(id),
    hardDeleteInvoice: (id: string) => hardDeleteInvoice.mutate(id),
    restoreExpense: (id: string) => restoreExpense.mutate(id),
    hardDeleteExpense: (id: string) => hardDeleteExpense.mutate(id),
  };
}
