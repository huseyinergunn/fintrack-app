'use client';

import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invoicesApi } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import type { Invoice, CreateInvoicePayload } from '@/types';

export function useInvoices() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ['invoices'],
    queryFn: () => invoicesApi.list().then((r) => r.data),
  });

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['invoices'] });
    qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
    qc.invalidateQueries({ queryKey: ['report'] });
  }, [qc]);

  const create = useMutation({
    mutationFn: (payload: CreateInvoicePayload) => invoicesApi.create(payload),
    onSuccess: invalidate,
  });

  const markPaid = useMutation({
    mutationFn: (id: string) => invoicesApi.markPaid(id),
    // Optimistic: fatura anında PAID görünür, sunucu cevabı beklenmez
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['invoices'] });
      const previous = qc.getQueryData<Invoice[]>(['invoices']);
      qc.setQueryData<Invoice[]>(['invoices'], (old = []) =>
        old.map((inv) =>
          inv.id === id
            ? { ...inv, status: 'PAID' as const, paidAt: new Date().toISOString() }
            : inv,
        ),
      );
      return { previous };
    },
    onError: (_, __, ctx) => {
      if (ctx?.previous) qc.setQueryData(['invoices'], ctx.previous);
      toast('İşlem başarısız', 'error');
    },
    onSettled: invalidate,
  });

  const softDelete = useMutation({
    mutationFn: (id: string) => invoicesApi.softDelete(id),
    // Optimistic: fatura anında listeden kalkar
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['invoices'] });
      const previous = qc.getQueryData<Invoice[]>(['invoices']);
      qc.setQueryData<Invoice[]>(['invoices'], (old = []) =>
        old.filter((inv) => inv.id !== id),
      );
      return { previous };
    },
    onSuccess: () => toast("Fatura Çöp Kutusu'na taşındı"),
    onError: (_, __, ctx) => {
      if (ctx?.previous) qc.setQueryData(['invoices'], ctx.previous);
      toast('Silme işlemi başarısız', 'error');
    },
    onSettled: invalidate,
  });

  const downloadPdf = async (id: string, invoiceNumber: string) => {
    setDownloadingId(id);
    try {
      await invoicesApi.downloadPdf(id, invoiceNumber);
    } finally {
      setDownloadingId(null);
    }
  };

  return { invoices, isLoading, create, markPaid, softDelete, downloadingId, downloadPdf };
}
