'use client';

import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { expensesApi } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import type { Expense, CreateExpensePayload, UpdateExpensePayload } from '@/types';

export function useExpenses() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: expenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ['expenses'],
    queryFn: () => expensesApi.list().then((r) => r.data),
  });

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['expenses'] });
    qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
    qc.invalidateQueries({ queryKey: ['report'] });
  }, [qc]);

  const create = useMutation({
    mutationFn: (payload: CreateExpensePayload) => expensesApi.create(payload),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateExpensePayload }) =>
      expensesApi.update(id, data),
    onSuccess: invalidate,
  });

  const approve = useMutation({
    mutationFn: (id: string) => expensesApi.approve(id),
    // Optimistic: gider anında APPROVED görünür
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['expenses'] });
      const previous = qc.getQueryData<Expense[]>(['expenses']);
      qc.setQueryData<Expense[]>(['expenses'], (old = []) =>
        old.map((exp) =>
          exp.id === id ? { ...exp, status: 'APPROVED' as const } : exp,
        ),
      );
      return { previous };
    },
    onError: (_, __, ctx) => {
      if (ctx?.previous) qc.setQueryData(['expenses'], ctx.previous);
      toast('Onaylama başarısız', 'error');
    },
    onSettled: invalidate,
  });

  const softDelete = useMutation({
    mutationFn: (id: string) => expensesApi.softDelete(id),
    // Optimistic: gider anında listeden kalkar
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['expenses'] });
      const previous = qc.getQueryData<Expense[]>(['expenses']);
      qc.setQueryData<Expense[]>(['expenses'], (old = []) =>
        old.filter((exp) => exp.id !== id),
      );
      return { previous };
    },
    onSuccess: () => toast("Ödeme Çöp Kutusu'na taşındı"),
    onError: (_, __, ctx) => {
      if (ctx?.previous) qc.setQueryData(['expenses'], ctx.previous);
      toast('Silme işlemi başarısız', 'error');
    },
    onSettled: invalidate,
  });

  return { expenses, isLoading, create, update, approve, softDelete };
}
