import { Injectable } from '@nestjs/common';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import * as path from 'path';
import * as fs from 'fs';

type LineItem = {
  description: string;
  quantity: unknown;
  unitPrice: unknown;
  total: unknown;
};

type InvoiceData = {
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  subtotal: unknown;
  taxRate: unknown;
  taxAmount: unknown;
  total: unknown;
  notes?: string | null;
  lineItems: LineItem[];
  client?: {
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    taxNumber?: string | null;
  } | null;
  user: {
    fullName?: string | null;
    companyName?: string | null;
    email: string;
  };
};

const toNum = (v: unknown) => parseFloat(String(v)) || 0;
const money = (v: unknown) =>
  toNum(v).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' TL';
const fmtDate = (d: Date) => d.toLocaleDateString('tr-TR');

// ── Colours ──────────────────────────────────────────────────────────────────
const C = {
  indigo:     rgb(0.31, 0.27, 0.9),
  indigoDark: rgb(0.22, 0.18, 0.78),
  indigoFade: rgb(0.94, 0.94, 0.99),
  dark:       rgb(0.1,  0.1,  0.14),
  mid:        rgb(0.38, 0.4,  0.46),
  muted:      rgb(0.56, 0.58, 0.63),
  border:     rgb(0.88, 0.89, 0.92),
  rowAlt:     rgb(0.97, 0.97, 0.99),
  white:      rgb(1,    1,    1),
};

@Injectable()
export class PdfService {
  private fontBytes: Buffer;
  private boldBytes: Buffer;

  constructor() {
    // Windows Segoe UI: full Unicode (Türkçe dahil), TTF, pdf-lib ile doğrudan çalışır
    const segoeReg  = 'C:\\Windows\\Fonts\\segoeui.ttf';
    const segoeBold = 'C:\\Windows\\Fonts\\segoeuib.ttf';

    if (fs.existsSync(segoeReg) && fs.existsSync(segoeBold)) {
      this.fontBytes = fs.readFileSync(segoeReg);
      this.boldBytes = fs.readFileSync(segoeBold);
    } else {
      // Non-Windows fallback: Roboto Medium (daha kalın görünür) + Bold
      const base = path.join(process.cwd(), 'node_modules/roboto-fontface/fonts/roboto');
      this.fontBytes = fs.readFileSync(path.join(base, 'Roboto-Medium.woff'));
      this.boldBytes = fs.readFileSync(path.join(base, 'Roboto-Bold.woff'));
    }
  }

  async generateInvoice(inv: InvoiceData): Promise<Buffer> {
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);

    const reg  = await doc.embedFont(this.fontBytes);
    const bold = await doc.embedFont(this.boldBytes);

    // A4
    const page = doc.addPage([595, 842]);
    const W = 595;
    const H = 842;
    const ML = 52;   // left margin
    const MR = 543;  // right margin
    const PW = MR - ML;

    // Helper — draw right-aligned text
    const textR = (text: string, rightEdge: number, y: number, opts: {
      font?: typeof reg; size?: number; color?: ReturnType<typeof rgb>;
    } = {}) => {
      const f = opts.font ?? reg;
      const s = opts.size ?? 10;
      const w = f.widthOfTextAtSize(text, s);
      page.drawText(text, { x: rightEdge - w, y, font: f, size: s, color: opts.color ?? C.dark });
    };

    // Helper — horizontal rule
    const rule = (y: number, color = C.border, thickness = 0.75) =>
      page.drawLine({ start: { x: ML, y }, end: { x: MR, y }, thickness, color });

    let y = H - 52;

    // ══ TOP ACCENT BAR ═══════════════════════════════════════════════════════
    page.drawRectangle({ x: 0, y: H - 8, width: W, height: 8, color: C.indigo });

    // ══ HEADER ═══════════════════════════════════════════════════════════════
    // "FATURA" — big title right
    const titleSize = 34;
    const titleText = 'FATURA';
    const titleW = bold.widthOfTextAtSize(titleText, titleSize);
    page.drawText(titleText, { x: MR - titleW, y, font: bold, size: titleSize, color: C.indigo });

    // Company name left
    const company = inv.user.companyName || inv.user.fullName || 'Sirket';
    page.drawText(company, { x: ML, y: y + 4, font: bold, size: 18, color: C.dark });

    y -= 20;
    page.drawText(inv.user.email, { x: ML, y, font: reg, size: 10, color: C.muted });

    // ══ DIVIDER ══════════════════════════════════════════════════════════════
    y -= 24;
    rule(y, C.indigo, 1.2);
    y -= 32;

    // ══ BILL-TO  |  INVOICE META ═════════════════════════════════════════════
    const sectionTop = y;
    const RCX = 316;
    const RCW = MR - RCX;

    // ── Left: client ─────────────────────────────────────────────────────────
    page.drawText('MÜŞTERİ', { x: ML, y, font: bold, size: 8.5, color: C.indigo });
    y -= 18;

    const clientName = inv.client?.name ?? 'Bireysel';
    page.drawText(clientName, { x: ML, y, font: bold, size: 14, color: C.dark });
    y -= 18;

    const clientLines = [
      inv.client?.email,
      inv.client?.phone,
      inv.client?.address,
      inv.client?.taxNumber ? 'VKN: ' + inv.client.taxNumber : null,
    ].filter(Boolean) as string[];

    for (const line of clientLines) {
      page.drawText(line, { x: ML, y, font: reg, size: 10, color: C.mid });
      y -= 16;
    }

    // ── Right: meta box ──────────────────────────────────────────────────────
    const metaRows: [string, string][] = [
      ['FATURA NO',   inv.invoiceNumber],
      ['DÜZENLEME',   fmtDate(inv.issueDate)],
      ['SON ÖDEME',   fmtDate(inv.dueDate)],
    ];
    const ROW_META = 32;
    const boxH = metaRows.length * ROW_META + 18;
    const boxY = sectionTop - boxH + 14;

    page.drawRectangle({
      x: RCX - 8, y: boxY,
      width: RCW + 8, height: boxH,
      color: C.indigoFade,
      borderColor: C.border, borderWidth: 0.75,
    });

    let my = sectionTop - 6;
    for (const [label, value] of metaRows) {
      page.drawText(label, { x: RCX, y: my, font: bold, size: 8.5, color: C.muted });
      textR(value, MR - 10, my - 1, { font: bold, size: 10.5, color: C.dark });
      my -= ROW_META;
    }

    y = Math.min(y, boxY) - 32;

    // ══ LINE ITEMS TABLE ══════════════════════════════════════════════════════
    // unit + total columns sized so "15.000,00 TL" (~70pt) never overflows
    const COLS = {
      no:    { x: ML,        w: 24  },
      desc:  { x: ML + 28,   w: 183 },
      qty:   { x: ML + 215,  w: 54  },
      unit:  { x: ML + 273,  w: 118 },
      total: { x: ML + 395,  w: MR - ML - 395 },
    };

    const HEAD_H = 34;
    const ROW_H  = 34;

    // Header background
    page.drawRectangle({ x: ML, y: y - HEAD_H + 12, width: PW, height: HEAD_H, color: C.indigo });

    // Header labels
    const headers: [string, { x: number; w: number }, 'left' | 'right'][] = [
      ['#',             COLS.no,    'left'],
      ['AÇIKLAMA',      COLS.desc,  'left'],
      ['ADET',          COLS.qty,   'right'],
      ['BİRİM FİYAT',   COLS.unit,  'right'],
      ['TOPLAM',        COLS.total, 'right'],
    ];

    for (const [label, col, align] of headers) {
      if (align === 'right') {
        const lw = bold.widthOfTextAtSize(label, 9);
        page.drawText(label, { x: col.x + col.w - lw, y: y - 10, font: bold, size: 9, color: C.white });
      } else {
        page.drawText(label, { x: col.x, y: y - 10, font: bold, size: 9, color: C.white });
      }
    }
    y -= HEAD_H;

    // Rows
    inv.lineItems.forEach((item, i) => {
      const bg = i % 2 === 0 ? C.white : C.rowAlt;
      page.drawRectangle({ x: ML, y: y - ROW_H + 12, width: PW, height: ROW_H, color: bg });

      const cy = y - 11;

      page.drawText(String(i + 1), { x: COLS.no.x, y: cy, font: reg, size: 10, color: C.muted });

      const desc = String(item.description);
      page.drawText(desc.length > 38 ? desc.slice(0, 36) + '…' : desc, {
        x: COLS.desc.x, y: cy, font: reg, size: 10, color: C.dark,
      });

      textR(String(toNum(item.quantity)), COLS.qty.x + COLS.qty.w, cy, { size: 10, color: C.mid });
      textR(money(item.unitPrice), COLS.unit.x + COLS.unit.w, cy, { size: 10, color: C.mid });
      textR(money(item.total), COLS.total.x + COLS.total.w, cy, { font: bold, size: 10, color: C.dark });

      y -= ROW_H;
    });

    // Bottom rule of table
    rule(y + 12, C.border, 0.75);
    y -= 22;

    // ══ TOTALS ════════════════════════════════════════════════════════════════
    const TX  = 365;
    const TRX = MR - 10;

    const totalsRows: [string, string][] = [
      ['Ara Toplam', money(inv.subtotal)],
      [`KDV (%${toNum(inv.taxRate).toFixed(0)})`, money(inv.taxAmount)],
    ];

    for (const [label, val] of totalsRows) {
      page.drawText(label, { x: TX, y, font: reg, size: 10.5, color: C.muted });
      textR(val, TRX, y, { size: 10.5, color: C.mid });
      y -= 22;
    }

    y -= 4;
    page.drawLine({ start: { x: TX, y }, end: { x: MR, y }, thickness: 0.75, color: C.border });
    y -= 8;

    // Grand total box
    const totBoxH = 38;
    page.drawRectangle({ x: TX - 10, y: y - totBoxH + 16, width: MR - TX + 10, height: totBoxH, color: C.indigoDark });
    page.drawText('TOPLAM', { x: TX, y: y - 6, font: bold, size: 12, color: C.white });
    textR(money(inv.total), TRX, y - 7, { font: bold, size: 14, color: C.white });
    y -= totBoxH;

    // ══ NOTES ════════════════════════════════════════════════════════════════
    if (inv.notes) {
      y -= 28;
      rule(y + 14, C.border);
      y -= 12;
      page.drawText('NOTLAR', { x: ML, y, font: bold, size: 8.5, color: C.muted });
      y -= 16;
      page.drawText(inv.notes.slice(0, 110), { x: ML, y, font: reg, size: 10, color: C.dark });
    }

    // ══ FOOTER ═══════════════════════════════════════════════════════════════
    const footerY = 40;
    rule(footerY + 16, C.border);

    const footerText = 'Bu fatura elektronik ortamda oluşturulmuştur.';
    const fw = reg.widthOfTextAtSize(footerText, 8.5);
    page.drawText(footerText, {
      x: (W - fw) / 2, y: footerY,
      font: reg, size: 8.5, color: C.muted,
    });

    // Bottom accent bar
    page.drawRectangle({ x: 0, y: 0, width: W, height: 6, color: C.indigo });

    const bytes = await doc.save();
    return Buffer.from(bytes);
  }
}
