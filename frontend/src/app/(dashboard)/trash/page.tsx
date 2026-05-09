'use client';

import { useState } from 'react';
import { Trash2, RotateCcw, X, FileText, CreditCard } from 'lucide-react';
import { useTrash } from '@/hooks/useTrash';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ── Sabitler ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Taslak', SENT: 'Gönderildi', PAID: 'Ödendi',
  OVERDUE: 'Vadesi Geçti', CANCELLED: 'İptal',
};
const STATUS_VARIANTS: Record<string, 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'> = {
  DRAFT: 'draft', SENT: 'sent', PAID: 'paid', OVERDUE: 'overdue', CANCELLED: 'cancelled',
};
const CATEGORY_LABELS: Record<string, string> = {
  OFFICE: 'Ofis', SOFTWARE: 'Yazılım', FOOD: 'Yemek',
  TRANSPORT: 'Ulaşım', UTILITY: 'Fatura', OTHER: 'Diğer',
};

const fmt = (val: string | number) =>
  parseFloat(String(val)).toLocaleString('tr-TR', { minimumFractionDigits: 2 });
const toDate = (iso: string) => new Date(iso).toLocaleDateString('tr-TR');

type Tab = 'invoices' | 'expenses';

// ── Sayfa ─────────────────────────────────────────────────────────────────────

export default function TrashPage() {
  const {
    trashedInvoices, loadingInv,
    trashedExpenses, loadingExp,
    restoreInvoice, hardDeleteInvoice,
    restoreExpense, hardDeleteExpense,
  } = useTrash();

  const [tab, setTab] = useState<Tab>('invoices');
  const totalCount = trashedInvoices.length + trashedExpenses.length;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Trash2 className="w-6 h-6" />
          Çöp Kutusu
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {totalCount === 0 ? 'Çöp kutusu boş' : `${totalCount} kayıt`}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {(['invoices', 'expenses'] as Tab[]).map((t) => {
          const count = t === 'invoices' ? trashedInvoices.length : trashedExpenses.length;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                tab === t
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {t === 'invoices' ? <FileText className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
              {t === 'invoices' ? 'Faturalar' : 'Giderler'}
              {count > 0 && (
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-muted text-muted-foreground text-[10px] font-bold">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Invoices tab */}
      {tab === 'invoices' && (
        loadingInv ? (
          <div className="text-center py-16 text-muted-foreground text-sm">Yükleniyor...</div>
        ) : trashedInvoices.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Silinmiş fatura yok</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">FATURA NO</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">MÜŞTERİ</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">TUTAR</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">DURUM</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">SİLİNME</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {trashedInvoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-foreground font-mono">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{inv.client?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground text-right">₺ {fmt(inv.total)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANTS[inv.status] ?? 'draft'}>
                        {STATUS_LABELS[inv.status] ?? inv.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{toDate(inv.deletedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => restoreInvoice(inv.id)}
                          className="text-green-400 hover:text-green-300"
                          title="Geri Yükle"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm(`"${inv.invoiceNumber}" kalıcı olarak silinecek. Bu işlem geri alınamaz.`))
                              hardDeleteInvoice(inv.id);
                          }}
                          className="text-muted-foreground hover:text-destructive"
                          title="Kalıcı Sil"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Expenses tab */}
      {tab === 'expenses' && (
        loadingExp ? (
          <div className="text-center py-16 text-muted-foreground text-sm">Yükleniyor...</div>
        ) : trashedExpenses.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Silinmiş gider yok</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">TARİH</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">TEDARİKÇİ</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">KATEGORİ</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">TUTAR</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">SİLİNME</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {trashedExpenses.map((exp) => (
                  <tr key={exp.id} className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-3 text-sm text-muted-foreground">{toDate(exp.expenseDate)}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{exp.vendor ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {CATEGORY_LABELS[exp.category] ?? exp.category}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground text-right">₺ {fmt(exp.amount)}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{toDate(exp.deletedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => restoreExpense(exp.id)}
                          className="text-green-400 hover:text-green-300"
                          title="Geri Yükle"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm('Bu gider kalıcı olarak silinecek. Bu işlem geri alınamaz.'))
                              hardDeleteExpense(exp.id);
                          }}
                          className="text-muted-foreground hover:text-destructive"
                          title="Kalıcı Sil"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
