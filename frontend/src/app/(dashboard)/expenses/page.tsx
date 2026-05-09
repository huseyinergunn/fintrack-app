'use client';

import { useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, ScanLine, CreditCard, CheckCircle, Eye,
  Loader2, Pencil, Trash2, Search, TrendingDown, AlertTriangle,
} from 'lucide-react';
import { expensesApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { useExpenses } from '@/hooks/useExpenses';
import { cn } from '@/lib/utils';
import type { Expense, ExpenseCategory, CreateExpensePayload, UpdateExpensePayload } from '@/types';

// ── Sabitler ──────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  OFFICE: 'Ofis', SOFTWARE: 'Yazılım', FOOD: 'Yemek',
  TRANSPORT: 'Ulaşım', UTILITY: 'Fatura', OTHER: 'Diğer',
};
const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS) as [ExpenseCategory, string][];

const STATUS_LABELS: Record<Expense['status'], string> = {
  PENDING_APPROVAL: 'Onay Bekliyor',
  APPROVED: 'Onaylandı',
  REJECTED: 'Reddedildi',
  PAID: 'Ödendi',
};
const STATUS_VARIANTS: Record<Expense['status'], 'pending' | 'sent' | 'overdue' | 'paid'> = {
  PENDING_APPROVAL: 'pending',
  APPROVED: 'sent',
  REJECTED: 'overdue',
  PAID: 'paid',
};

// ── Form şeması ───────────────────────────────────────────────────────────────

const expenseSchema = z.object({
  category: z.enum(['OFFICE', 'SOFTWARE', 'FOOD', 'TRANSPORT', 'UTILITY', 'OTHER']),
  vendor: z.string().optional(),
  amount: z.coerce.number().min(0.01, 'Tutar gerekli'),
  taxAmount: z.coerce
    .number()
    .min(0)
    .optional()
    .or(z.literal(''))
    .transform((v) => (v === '' ? undefined : v)),
  expenseDate: z.string().min(1, 'Tarih gerekli'),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  receiptUrl: z.string().optional(),
});
type ExpenseForm = z.infer<typeof expenseSchema>;

// ── Yardımcılar ───────────────────────────────────────────────────────────────

const fmt = (val: string | number) =>
  parseFloat(String(val ?? 0)).toLocaleString('tr-TR', { minimumFractionDigits: 2 });
const toDate = (iso: string) => new Date(iso).toLocaleDateString('tr-TR');
const today = () => new Date().toISOString().split('T')[0];

const isOverdue = (exp: Expense) =>
  !!exp.dueDate &&
  new Date(exp.dueDate) < new Date() &&
  exp.status !== 'PAID' &&
  exp.status !== 'REJECTED';

type SortKey = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'vendor-asc' | 'vendor-desc';
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'date-desc',   label: 'Tarih (Yeni → Eski)' },
  { value: 'date-asc',    label: 'Tarih (Eski → Yeni)' },
  { value: 'amount-desc', label: 'Tutar (Büyük → Küçük)' },
  { value: 'amount-asc',  label: 'Tutar (Küçük → Büyük)' },
  { value: 'vendor-asc',  label: 'Tedarikçi (A → Z)' },
  { value: 'vendor-desc', label: 'Tedarikçi (Z → A)' },
];

// ── Sayfa ─────────────────────────────────────────────────────────────────────

export default function ExpensesPage() {
  const { expenses, isLoading, create, update, approve, softDelete } = useExpenses();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [ocrConfidence, setOcrConfidence] = useState<string | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date-desc');
  const [taxRateInput, setTaxRateInput] = useState('');

  // ── Filtreleme ─────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const list = expenses.filter(
      (e) =>
        !q ||
        (e.vendor ?? '').toLowerCase().includes(q) ||
        CATEGORY_LABELS[e.category]?.toLowerCase().includes(q) ||
        (e.notes ?? '').toLowerCase().includes(q),
    );
    return [...list].sort((a, b) => {
      switch (sortKey) {
        case 'date-desc':   return new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime();
        case 'date-asc':    return new Date(a.expenseDate).getTime() - new Date(b.expenseDate).getTime();
        case 'amount-desc': return parseFloat(String(b.amount)) - parseFloat(String(a.amount));
        case 'amount-asc':  return parseFloat(String(a.amount)) - parseFloat(String(b.amount));
        case 'vendor-asc':  return (a.vendor ?? '').localeCompare(b.vendor ?? '', 'tr');
        case 'vendor-desc': return (b.vendor ?? '').localeCompare(a.vendor ?? '', 'tr');
        default: return 0;
      }
    });
  }, [expenses, search, sortKey]);

  const overdueCount = expenses.filter(isOverdue).length;

  // ── Form ───────────────────────────────────────────────────────────────────

  const {
    register, handleSubmit, reset, setValue, watch,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { category: 'OTHER', expenseDate: today() },
  });

  const watchedAmount = watch('amount');

  // ── Dialog yönetimi ────────────────────────────────────────────────────────

  const openManual = () => {
    setEditingId(null);
    reset({ category: 'OTHER', expenseDate: today() });
    setTaxRateInput('');
    setOcrConfidence(null);
    setReceiptPreview(null);
    setServerError(null);
    setDialogOpen(true);
  };

  const openEdit = (exp: Expense) => {
    setEditingId(exp.id);
    reset({
      category: exp.category,
      vendor: exp.vendor ?? '',
      amount: parseFloat(String(exp.amount)),
      taxAmount: exp.taxAmount ? parseFloat(String(exp.taxAmount)) : undefined,
      expenseDate: exp.expenseDate.split('T')[0],
      dueDate: exp.dueDate ? exp.dueDate.split('T')[0] : '',
      notes: exp.notes ?? '',
      receiptUrl: exp.receiptUrl ?? '',
    });
    setReceiptPreview(exp.receiptUrl ?? null);
    setTaxRateInput('');
    setOcrConfidence(null);
    setServerError(null);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setTaxRateInput('');
    setOcrConfidence(null);
    setReceiptPreview(null);
  };

  // ── OCR ────────────────────────────────────────────────────────────────────

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setScanning(true);
    try {
      const res = await expensesApi.scan(file);
      const ocr = res.data;
      reset({ category: 'OTHER', expenseDate: today() });
      if (ocr.vendor)     setValue('vendor', ocr.vendor);
      if (ocr.total)      setValue('amount', ocr.total);
      if (ocr.taxAmount)  setValue('taxAmount', ocr.taxAmount);
      if (ocr.date)       setValue('expenseDate', ocr.date);
      if (ocr.receiptUrl) setValue('receiptUrl', ocr.receiptUrl);
      if (ocr.category && CATEGORY_LABELS[ocr.category as ExpenseCategory]) {
        setValue('category', ocr.category as ExpenseForm['category']);
      }
      setOcrConfidence(ocr.confidence);
      setReceiptPreview(ocr.receiptUrl ?? null);
      setEditingId(null);
      setServerError(null);
      setDialogOpen(true);
    } catch {
      setServerError('Fiş tarama sırasında hata oluştu. Manuel giriş yapabilirsin.');
      setDialogOpen(true);
    } finally {
      setScanning(false);
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const onSubmit = async (data: ExpenseForm) => {
    setServerError(null);
    const payload: CreateExpensePayload = {
      category: data.category,
      expenseDate: data.expenseDate,
      amount: Number(data.amount),
      ...(data.dueDate    ? { dueDate: data.dueDate }                 : {}),
      ...(data.vendor     ? { vendor: data.vendor }                   : {}),
      ...(data.taxAmount  ? { taxAmount: Number(data.taxAmount) }     : {}),
      ...(data.notes      ? { notes: data.notes }                     : {}),
      ...(data.receiptUrl ? { receiptUrl: data.receiptUrl }           : {}),
    };
    try {
      if (editingId) {
        await update.mutateAsync({ id: editingId, data: payload as UpdateExpensePayload });
      } else {
        await create.mutateAsync(payload);
      }
      closeDialog();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })
        ?.response?.data?.message;
      setServerError(
        Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Gider kaydedilirken hata oluştu.'),
      );
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-8">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Başlık */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ödemeler / Borçlar</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {expenses.length} kayıt · dışarıya yapılan ödemeler
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={scanning}>
            {scanning
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <ScanLine className="w-4 h-4" />}
            {scanning ? 'Taranıyor...' : 'Fiş Tara'}
          </Button>
          <Button onClick={openManual} className="bg-red-600 hover:bg-red-700 text-white">
            <Plus className="w-4 h-4" />Ödeme Ekle
          </Button>
        </div>
      </div>

      {/* Bilgi bandı */}
      <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-lg bg-red-500/5 border border-red-500/15 text-red-400 text-xs">
        <TrendingDown className="w-4 h-4 shrink-0" />
        Bu bölüm dışarıya yaptığınız ödemeleri gösterir.
        Ödeme yapıldığında <span className="font-semibold">Onayla</span> ile onaylayabilirsiniz.
      </div>

      {overdueCount > 0 && (
        <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            <span className="font-semibold">{overdueCount} ödemenin</span> vadesi geçti — lütfen kontrol edin.
          </span>
        </div>
      )}

      {/* Filtre */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tedarikçi, kategori, not..."
            className="flex h-9 w-full rounded-md border border-input bg-muted pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <Select
          value={sortKey}
          onChange={(v) => setSortKey(v as SortKey)}
          options={SORT_OPTIONS}
        />
      </div>

      {/* Tablo */}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground text-sm">Yükleniyor...</div>
      ) : expenses.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Henüz ödeme yok</p>
          <p className="text-xs mt-1 opacity-60">Fiş tara veya manuel ödeme ekle</p>
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
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">TARİH</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">TEDARİKÇİ</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">KATEGORİ</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">VADE</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">TUTAR</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">DURUM</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((exp) => {
                const overdue = isOverdue(exp);
                return (
                  <tr
                    key={exp.id}
                    className={cn(
                      'border-b border-border last:border-0 hover:bg-muted/10 transition-colors',
                      overdue && 'bg-red-500/5',
                    )}
                  >
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {toDate(exp.expenseDate)}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">{exp.vendor ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {CATEGORY_LABELS[exp.category] ?? exp.category}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {exp.dueDate ? (
                        <span className={cn(overdue ? 'text-red-400 font-medium' : 'text-muted-foreground')}>
                          {overdue && <AlertTriangle className="inline w-3 h-3 mr-1" />}
                          {toDate(exp.dueDate)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground text-right">
                      ₺ {fmt(exp.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANTS[exp.status]}>
                        {STATUS_LABELS[exp.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {exp.status === 'PENDING_APPROVAL' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => approve.mutate(exp.id)}
                            disabled={approve.isPending}
                            className="text-green-400 hover:text-green-300 gap-1.5 text-xs"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />Onayla
                          </Button>
                        )}
                        {exp.receiptUrl && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(exp.receiptUrl!, '_blank')}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(exp)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => softDelete.mutate(exp.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        title={editingId ? 'Ödemeyi Düzenle' : 'Ödeme Ekle'}
      >
        {ocrConfidence && (
          <div
            className={`mb-4 px-3 py-2 rounded-lg text-xs border flex items-center gap-2 ${
              ocrConfidence === 'high'
                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                : ocrConfidence === 'medium'
                  ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                  : 'bg-muted text-muted-foreground border-border'
            }`}
          >
            <ScanLine className="w-3.5 h-3.5" />
            OCR güveni: <span className="font-medium capitalize">{ocrConfidence}</span>
            {' '}— Alanları kontrol et ve düzelt
          </div>
        )}

        {receiptPreview && (
          <div className="mb-4">
            <a href={receiptPreview} target="_blank" rel="noreferrer">
              <img
                src={receiptPreview}
                alt="Fiş"
                className="w-full max-h-40 object-cover rounded-lg border border-border"
              />
            </a>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Kategori *</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                {...register('category')}
              >
                {CATEGORY_OPTIONS.map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Ödeme Tarihi *</Label>
              <Input type="date" error={errors.expenseDate?.message} {...register('expenseDate')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Tedarikçi / Alacaklı</Label>
            <Input placeholder="Migros, Getir, Vodafone..." {...register('vendor')} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Toplam Tutar (₺) *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                error={errors.amount?.message}
                {...register('amount')}
              />
            </div>
            <div className="space-y-1.5">
              <Label>KDV Oranı %</Label>
              <Input
                type="number"
                min={0}
                max={100}
                placeholder="20"
                value={taxRateInput}
                onChange={(e) => {
                  setTaxRateInput(e.target.value);
                  const rate = parseFloat(e.target.value);
                  const amount = Number(watchedAmount);
                  if (!isNaN(rate) && amount > 0) {
                    const tax = amount - amount / (1 + rate / 100);
                    setValue('taxAmount', Math.round(tax * 100) / 100);
                  }
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>KDV Tutarı (₺)</Label>
              <Input type="number" step="0.01" placeholder="0.00" {...register('taxAmount')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>
              Vade Tarihi{' '}
              <span className="text-muted-foreground text-xs">(opsiyonel)</span>
            </Label>
            <Input type="date" {...register('dueDate')} />
            <p className="text-xs text-muted-foreground">
              Belirtilirse Dashboard'daki "Bekleyen" ve "Vadesi Geçmiş" kutularına yansır.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Notlar</Label>
            <Input placeholder="Opsiyonel not..." {...register('notes')} />
          </div>

          <input type="hidden" {...register('receiptUrl')} />

          {serverError && <p className="text-sm text-destructive">{serverError}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={closeDialog}>
              İptal
            </Button>
            <Button type="submit" className="flex-1" loading={isSubmitting}>
              {editingId ? 'Güncelle' : 'Kaydet'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
