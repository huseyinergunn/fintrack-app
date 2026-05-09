'use client';

import { useMemo, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, Trash2, FileText, CheckCircle, Download,
  Eye, AlertTriangle, Loader2, Search, TrendingUp,
} from 'lucide-react';
import { invoicesApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { useInvoices } from '@/hooks/useInvoices';
import { useClients } from '@/hooks/useClients';
import type { Invoice, CreateInvoicePayload } from '@/types';

// ── Sabitler ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<Invoice['status'], string> = {
  DRAFT: 'Taslak', SENT: 'Gönderildi', PAID: 'Ödendi',
  OVERDUE: 'Vadesi Geçti', CANCELLED: 'İptal',
};
const STATUS_VARIANTS: Record<Invoice['status'], 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'> = {
  DRAFT: 'draft', SENT: 'sent', PAID: 'paid', OVERDUE: 'overdue', CANCELLED: 'cancelled',
};

// ── Form şeması ───────────────────────────────────────────────────────────────

const lineItemSchema = z.object({
  description: z.string().min(1, 'Açıklama gerekli'),
  quantity: z.coerce.number().min(0.01, "0'dan büyük olmalı"),
  unitPrice: z.coerce.number().min(0, 'Geçersiz fiyat'),
});
const invoiceSchema = z.object({
  clientId: z.string().optional(),
  issueDate: z.string().min(1, 'Düzenleme tarihi gerekli'),
  dueDate: z.string().min(1, 'Vade tarihi gerekli'),
  taxRate: z.coerce.number().min(0).max(100),
  notes: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1, 'En az bir kalem ekleyin'),
});
type InvoiceForm = z.infer<typeof invoiceSchema>;

// ── Yardımcı fonksiyonlar ─────────────────────────────────────────────────────

const fmt = (val: string | number) =>
  parseFloat(String(val ?? 0)).toLocaleString('tr-TR', { minimumFractionDigits: 2 });
const toDate = (iso: string) => new Date(iso).toLocaleDateString('tr-TR');
const today = () => new Date().toISOString().split('T')[0];
const monthLater = () => {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().split('T')[0];
};

const DEFAULT_FORM_VALUES: Partial<InvoiceForm> = {
  issueDate: '', dueDate: '', taxRate: 20,
  lineItems: [{ description: '', quantity: 1, unitPrice: 0 }],
};

// ── Sıralama ──────────────────────────────────────────────────────────────────

type SortKey =
  | 'date-desc' | 'date-asc'
  | 'amount-desc' | 'amount-asc'
  | 'client-asc' | 'client-desc'
  | 'number-asc';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'date-desc',   label: 'Tarih (Yeni → Eski)' },
  { value: 'date-asc',    label: 'Tarih (Eski → Yeni)' },
  { value: 'amount-desc', label: 'Tutar (Büyük → Küçük)' },
  { value: 'amount-asc',  label: 'Tutar (Küçük → Büyük)' },
  { value: 'client-asc',  label: 'Müşteri (A → Z)' },
  { value: 'client-desc', label: 'Müşteri (Z → A)' },
  { value: 'number-asc',  label: 'Fatura No' },
];

// ── Sayfa ─────────────────────────────────────────────────────────────────────

export default function InvoicesPage() {
  const { invoices, isLoading, create, markPaid, softDelete, downloadingId, downloadPdf } = useInvoices();
  const { clients } = useClients();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date-desc');
  const [statusFilter, setStatusFilter] = useState('');
  const [taxInclusive, setTaxInclusive] = useState(false);

  // ── Filtreleme & Sıralama ──────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const list = invoices.filter((inv) => {
      const matchSearch =
        !q ||
        inv.invoiceNumber.toLowerCase().includes(q) ||
        (inv.client?.name ?? '').toLowerCase().includes(q);
      return matchSearch && (!statusFilter || inv.status === statusFilter);
    });
    return [...list].sort((a, b) => {
      switch (sortKey) {
        case 'date-desc':   return new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime();
        case 'date-asc':    return new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime();
        case 'amount-desc': return parseFloat(String(b.total)) - parseFloat(String(a.total));
        case 'amount-asc':  return parseFloat(String(a.total)) - parseFloat(String(b.total));
        case 'client-asc':  return (a.client?.name ?? '').localeCompare(b.client?.name ?? '', 'tr');
        case 'client-desc': return (b.client?.name ?? '').localeCompare(a.client?.name ?? '', 'tr');
        case 'number-asc':  return a.invoiceNumber.localeCompare(b.invoiceNumber);
        default: return 0;
      }
    });
  }, [invoices, search, sortKey, statusFilter]);

  // ── Form ───────────────────────────────────────────────────────────────────

  const {
    register, handleSubmit, control, watch, reset,
    formState: { errors, isSubmitting },
  } = useForm<InvoiceForm>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: { ...DEFAULT_FORM_VALUES, issueDate: today(), dueDate: monthLater() },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lineItems' });
  const watchedItems = watch('lineItems') ?? [];
  const watchedTaxRate = Number(watch('taxRate') ?? 20);

  const grossTotal = watchedItems.reduce(
    (s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0,
  );
  const subtotal = taxInclusive
    ? Math.round((grossTotal / (1 + watchedTaxRate / 100)) * 100) / 100
    : grossTotal;
  const taxAmount = taxInclusive
    ? Math.round((grossTotal - subtotal) * 100) / 100
    : Math.round(subtotal * watchedTaxRate) / 100;
  const total = taxInclusive ? grossTotal : subtotal + taxAmount;

  // ── Dialog yönetimi ────────────────────────────────────────────────────────

  const openCreate = () => {
    reset({ ...DEFAULT_FORM_VALUES, issueDate: today(), dueDate: monthLater() });
    setTaxInclusive(false);
    setServerError(null);
    setDialogOpen(true);
  };
  const closeDialog = () => setDialogOpen(false);

  const onSubmit = async (data: InvoiceForm) => {
    setServerError(null);
    const payload: CreateInvoicePayload = { ...data, taxInclusive };
    try {
      await create.mutateAsync(payload);
      closeDialog();
    } catch {
      setServerError('Fatura oluşturulurken bir hata oluştu.');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const overdueInvoices = invoices.filter((i) => i.status === 'OVERDUE');

  return (
    <div className="p-8">
      {/* Başlık */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Satışlar / Alacaklar</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {invoices.length} fatura · müşteriye kesilmiş
          </p>
        </div>
        <Button onClick={openCreate} className="bg-green-600 hover:bg-green-700 text-white">
          <Plus className="w-4 h-4" />Yeni Satış Faturası
        </Button>
      </div>

      {/* Bilgi bandı */}
      <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-lg bg-green-500/5 border border-green-500/15 text-green-400 text-xs">
        <TrendingUp className="w-4 h-4 shrink-0" />
        Bu bölüm müşterilere kestiğiniz satış faturalarını gösterir.
        Ödeme aldığınızda <span className="font-semibold">Ödendi</span> olarak işaretleyin.
      </div>

      {/* Vadesi geçmiş uyarısı */}
      {overdueInvoices.length > 0 && (
        <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            <span className="font-semibold">{overdueInvoices.length} alacağın</span> vadesi geçti — toplam{' '}
            <span className="font-semibold">
              ₺{' '}
              {overdueInvoices
                .reduce((s, i) => s + parseFloat(String(i.total)), 0)
                .toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </span>{' '}
            henüz tahsil edilmedi.
          </span>
        </div>
      )}

      {/* Filtre çubuğu */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Fatura no, müşteri adı..."
            className="flex h-9 w-full rounded-md border border-input bg-muted pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: '', label: 'Tüm Durumlar' },
            ...Object.entries(STATUS_LABELS).map(([v, l]) => ({ value: v, label: l })),
          ]}
        />
        <Select
          value={sortKey}
          onChange={(v) => setSortKey(v as SortKey)}
          options={SORT_OPTIONS}
        />
      </div>

      {/* Tablo */}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground text-sm">Yükleniyor...</div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Henüz fatura yok</p>
          <p className="text-xs mt-1 opacity-60">İlk faturayı oluşturmak için butona tıkla</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Arama sonucu bulunamadı.
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">FATURA NO</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">MÜŞTERİ</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">DÜZENLEME</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">VADE</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">TUTAR</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">DURUM</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr
                  key={inv.id}
                  className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-medium text-foreground font-mono">
                    {inv.invoiceNumber}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {inv.client?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{toDate(inv.issueDate)}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{toDate(inv.dueDate)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-foreground text-right">
                    ₺ {fmt(inv.total)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANTS[inv.status]}>{STATUS_LABELS[inv.status]}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {(inv.status === 'DRAFT' || inv.status === 'SENT' || inv.status === 'OVERDUE') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markPaid.mutate(inv.id)}
                          className="text-green-400 hover:text-green-300 text-xs gap-1.5"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />Ödendi
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => invoicesApi.previewPdf(inv.id)}
                        className="text-muted-foreground hover:text-foreground text-xs gap-1.5"
                        title="Önizle"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadPdf(inv.id, inv.invoiceNumber)}
                        disabled={downloadingId === inv.id}
                        className="text-muted-foreground hover:text-foreground text-xs gap-1.5"
                        title="PDF İndir"
                      >
                        {downloadingId === inv.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Download className="w-3.5 h-3.5" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => softDelete.mutate(inv.id)}
                        className="text-muted-foreground hover:text-destructive"
                        title="Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Yeni Fatura Dialog */}
      <Dialog open={dialogOpen} onClose={closeDialog} title="Yeni Fatura" size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Müşteri */}
          <div className="space-y-1.5">
            <Label>Müşteri</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              {...register('clientId')}
            >
              <option value="">— Müşteri seçin (opsiyonel) —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Tarihler + KDV */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Düzenleme Tarihi *</Label>
              <Input type="date" error={errors.issueDate?.message} {...register('issueDate')} />
            </div>
            <div className="space-y-1.5">
              <Label>Vade Tarihi *</Label>
              <Input type="date" error={errors.dueDate?.message} {...register('dueDate')} />
            </div>
            <div className="space-y-1.5">
              <Label>KDV %</Label>
              <Input type="number" min={0} max={100} {...register('taxRate')} />
            </div>
          </div>

          {/* KDV Dahil toggle */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={taxInclusive}
              onChange={(e) => setTaxInclusive(e.target.checked)}
              className="w-4 h-4 rounded accent-primary"
            />
            <span className="text-sm text-foreground">Fiyatlar KDV dahil</span>
            <span className="text-xs text-muted-foreground">(KDV içinden ayrılır)</span>
          </label>

          {/* Kalemler */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Kalemler *</Label>
              <button
                type="button"
                onClick={() => append({ description: '', quantity: 1, unitPrice: 0 })}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Kalem Ekle
              </button>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_80px_100px_36px] gap-2 px-1">
                <span className="text-xs text-muted-foreground">Açıklama</span>
                <span className="text-xs text-muted-foreground">Adet</span>
                <span className="text-xs text-muted-foreground">
                  {taxInclusive ? 'Birim ₺ (KDV dahil)' : 'Birim ₺'}
                </span>
              </div>
              {fields.map((field, i) => (
                <div
                  key={field.id}
                  className="grid grid-cols-[1fr_80px_100px_36px] gap-2 items-start"
                >
                  <Input
                    placeholder="Logo Tasarımı"
                    error={errors.lineItems?.[i]?.description?.message}
                    {...register(`lineItems.${i}.description`)}
                  />
                  <Input
                    type="number"
                    placeholder="1"
                    step="0.01"
                    error={errors.lineItems?.[i]?.quantity?.message}
                    {...register(`lineItems.${i}.quantity`)}
                  />
                  <Input
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    error={errors.lineItems?.[i]?.unitPrice?.message}
                    {...register(`lineItems.${i}.unitPrice`)}
                  />
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    disabled={fields.length === 1}
                    className="h-10 flex items-center justify-center text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {errors.lineItems?.root && (
                <p className="text-xs text-destructive">{errors.lineItems.root.message}</p>
              )}
            </div>
          </div>

          {/* Notlar */}
          <div className="space-y-1.5">
            <Label>Notlar</Label>
            <Input placeholder="Opsiyonel not..." {...register('notes')} />
          </div>

          {/* Özet */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-1.5 text-sm border border-border">
            {taxInclusive && (
              <div className="flex justify-between text-muted-foreground">
                <span>Brüt Toplam</span><span>₺ {fmt(grossTotal)}</span>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground">
              <span>{taxInclusive ? 'Matrah (KDV hariç)' : 'Ara Toplam'}</span>
              <span>₺ {fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>KDV (%{watchedTaxRate})</span><span>₺ {fmt(taxAmount)}</span>
            </div>
            <div className="flex justify-between font-semibold text-foreground border-t border-border pt-1.5">
              <span>Toplam</span><span>₺ {fmt(total)}</span>
            </div>
          </div>

          {serverError && <p className="text-sm text-destructive">{serverError}</p>}

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={closeDialog}>
              İptal
            </Button>
            <Button type="submit" className="flex-1" loading={isSubmitting}>
              Fatura Oluştur
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
