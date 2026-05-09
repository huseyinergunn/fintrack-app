'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Users, Search } from 'lucide-react';
import { useClients } from '@/hooks/useClients';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog } from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Client, ClientFormData } from '@/types';

// ── Sabitler ──────────────────────────────────────────────────────────────────

const clientSchema = z.object({
  name: z.string().min(1, 'İsim gerekli'),
  email: z.string().email('Geçerli email girin').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  taxNumber: z.string().optional(),
});
type ClientForm = z.infer<typeof clientSchema>;

const clean = (data: ClientForm): ClientFormData =>
  Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v === '' ? undefined : v])) as unknown as ClientFormData;

type SortKey = 'name-asc' | 'name-desc' | 'date-desc' | 'date-asc';
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'name-asc',  label: 'İsim (A → Z)' },
  { value: 'name-desc', label: 'İsim (Z → A)' },
  { value: 'date-desc', label: 'Eklenme (Yeni → Eski)' },
  { value: 'date-asc',  label: 'Eklenme (Eski → Yeni)' },
];

// ── Sayfa ─────────────────────────────────────────────────────────────────────

export default function ClientsPage() {
  const { clients, isLoading, create, update, remove } = useClients();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name-asc');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const list = clients.filter((c) =>
      !q ||
      c.name.toLowerCase().includes(q) ||
      (c.email ?? '').toLowerCase().includes(q) ||
      (c.phone ?? '').includes(q) ||
      (c.taxNumber ?? '').includes(q),
    );
    return [...list].sort((a, b) => {
      switch (sortKey) {
        case 'name-asc':  return a.name.localeCompare(b.name, 'tr');
        case 'name-desc': return b.name.localeCompare(a.name, 'tr');
        case 'date-desc': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'date-asc':  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        default: return 0;
      }
    });
  }, [clients, search, sortKey]);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ClientForm>({
    resolver: zodResolver(clientSchema),
  });

  const openCreate = () => {
    setEditing(null);
    reset({ name: '', email: '', phone: '', address: '', taxNumber: '' });
    setServerError(null);
    setDialogOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditing(client);
    reset({
      name: client.name,
      email: client.email ?? '',
      phone: client.phone ?? '',
      address: client.address ?? '',
      taxNumber: client.taxNumber ?? '',
    });
    setServerError(null);
    setDialogOpen(true);
  };

  const closeDialog = () => { setDialogOpen(false); setEditing(null); };

  const onSubmit = async (data: ClientForm) => {
    setServerError(null);
    try {
      if (editing) await update(editing.id, clean(data));
      else await create(clean(data));
      closeDialog();
    } catch {
      setServerError('İşlem sırasında bir hata oluştu.');
    }
  };

  const handleDelete = (client: Client) => {
    if (!confirm(`"${client.name}" silinecek. Emin misin?`)) return;
    remove(client.id);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Müşteriler</h1>
          <p className="text-muted-foreground text-sm mt-1">{clients.length} müşteri</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4" />Yeni Müşteri</Button>
      </div>

      {/* Filtre Çubuğu */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="İsim, email, telefon, vergi no..."
            className="flex h-9 w-full rounded-md border border-input bg-muted pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <Select
          value={sortKey}
          onChange={(v) => setSortKey(v as SortKey)}
          options={SORT_OPTIONS}
        />
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground text-sm">Yükleniyor...</div>
      ) : clients.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Henüz müşteri yok</p>
          <p className="text-xs mt-1 opacity-60">İlk müşteriyi eklemek için butona tıkla</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Arama sonucu bulunamadı.</div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">İSİM</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">EMAIL</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">TELEFON</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">VERGİ NO</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((client, i) => (
                <tr
                  key={client.id}
                  className={cn(
                    'border-b border-border last:border-0 hover:bg-muted/10 transition-colors',
                    i % 2 !== 0 && 'bg-muted/10',
                  )}
                >
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{client.name}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{client.email ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{client.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{client.taxNumber ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(client)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(client)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onClose={closeDialog} title={editing ? 'Müşteriyi Düzenle' : 'Yeni Müşteri'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">İsim *</Label>
            <Input id="name" error={errors.name?.message} {...register('name')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" error={errors.email?.message} {...register('email')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Telefon</Label>
            <Input id="phone" {...register('phone')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address">Adres</Label>
            <Input id="address" {...register('address')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="taxNumber">Vergi / TC No</Label>
            <Input id="taxNumber" {...register('taxNumber')} />
          </div>
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={closeDialog}>
              İptal
            </Button>
            <Button type="submit" className="flex-1" loading={isSubmitting}>
              {editing ? 'Kaydet' : 'Ekle'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
