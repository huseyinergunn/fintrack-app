'use client';

import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clientsApi } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import type { Client, ClientFormData } from '@/types';

export function useClients() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: () => clientsApi.list().then((r) => r.data),
  });

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['clients'] });
  }, [qc]);

  const createMutation = useMutation({
    mutationFn: (data: ClientFormData) => clientsApi.create(data),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ClientFormData }) =>
      clientsApi.update(id, data),
    onSuccess: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => clientsApi.remove(id),
    onSuccess: () => {
      invalidate();
      toast('Müşteri silindi');
    },
    onError: () => toast('Silme işlemi başarısız', 'error'),
  });

  return {
    clients,
    isLoading,
    create: (data: ClientFormData) => createMutation.mutateAsync(data),
    update: (id: string, data: ClientFormData) => updateMutation.mutateAsync({ id, data }),
    remove: (id: string) => removeMutation.mutate(id),
  };
}
