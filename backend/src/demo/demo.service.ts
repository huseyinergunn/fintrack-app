import { Injectable } from '@nestjs/common';
import { InvoiceStatus, ExpenseCategory, ExpenseStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

const DEMO_EMAIL = 'demo@fintrack.app';
const DEMO_PASSWORD = 'demo1234';

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
}

@Injectable()
export class DemoService {
  constructor(private prisma: PrismaService) {}

  async reset() {
    const existing = await this.prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
    if (existing) {
      await this.prisma.user.delete({ where: { email: DEMO_EMAIL } });
    }

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
    const user = await this.prisma.user.create({
      data: {
        email: DEMO_EMAIL,
        passwordHash,
        fullName: 'Ayşe Kaya',
        companyName: 'Kaya Dijital Ajans',
      },
    });

    const [kozan, techvision, modastore, startup, medya] = await Promise.all([
      this.prisma.client.create({ data: { userId: user.id, name: 'Kozan Ajans', email: 'finans@kozanajans.com', phone: '0212 555 01 01', address: 'Levent, İstanbul', taxNumber: '1234567890' } }),
      this.prisma.client.create({ data: { userId: user.id, name: 'TechVision A.Ş.', email: 'muhasebe@techvision.com.tr', phone: '0312 444 02 02', address: 'Çankaya, Ankara', taxNumber: '9876543210' } }),
      this.prisma.client.create({ data: { userId: user.id, name: 'Moda Store', email: 'ik@modasore.com', phone: '0232 333 03 03', address: 'Alsancak, İzmir' } }),
      this.prisma.client.create({ data: { userId: user.id, name: 'NextGen Startup', email: 'cfo@nextgenstartup.io', phone: '0850 123 45 67', address: 'Maslak, İstanbul' } }),
      this.prisma.client.create({ data: { userId: user.id, name: 'Medya 360', email: 'proje@medya360.com', phone: '0216 777 08 08', address: 'Kadıköy, İstanbul' } }),
    ]);

    const createInvoice = (opts: {
      client: typeof kozan;
      issueDate: Date;
      dueDate: Date;
      status: InvoiceStatus;
      paidAt?: Date;
      items: { description: string; quantity: number; unitPrice: number }[];
      notes?: string;
      seq: number;
    }) => {
      const subtotal = opts.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
      const taxAmount = Math.round(subtotal * 20) / 100;
      const total = subtotal + taxAmount;
      return this.prisma.invoice.create({
        data: {
          userId: user.id,
          clientId: opts.client.id,
          invoiceNumber: `INV-DEMO-${String(opts.seq).padStart(4, '0')}`,
          status: opts.status,
          issueDate: opts.issueDate,
          dueDate: opts.dueDate,
          subtotal,
          taxRate: 20,
          taxAmount,
          total,
          notes: opts.notes ?? null,
          paidAt: opts.paidAt ?? null,
          lineItems: {
            create: opts.items.map((i) => ({
              description: i.description,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              total: i.quantity * i.unitPrice,
            })),
          },
        },
      });
    };

    await Promise.all([
      createInvoice({ seq: 1, client: kozan, issueDate: daysAgo(90), dueDate: daysAgo(60), status: InvoiceStatus.PAID, paidAt: daysAgo(58), items: [{ description: 'Kurumsal Web Sitesi Tasarımı', quantity: 1, unitPrice: 12000 }, { description: 'Logo & Marka Kimliği', quantity: 1, unitPrice: 4500 }], notes: 'Revizyon hakkı 2 tur dahil.' }),
      createInvoice({ seq: 2, client: techvision, issueDate: daysAgo(75), dueDate: daysAgo(45), status: InvoiceStatus.PAID, paidAt: daysAgo(44), items: [{ description: 'Mobil Uygulama UI/UX Tasarımı', quantity: 1, unitPrice: 18000 }, { description: 'Prototip & Kullanıcı Testi', quantity: 1, unitPrice: 3500 }] }),
      createInvoice({ seq: 3, client: modastore, issueDate: daysAgo(60), dueDate: daysAgo(30), status: InvoiceStatus.PAID, paidAt: daysAgo(28), items: [{ description: 'E-Ticaret Arayüz Tasarımı', quantity: 1, unitPrice: 9000 }, { description: 'Ürün Fotoğrafı Düzenleme (50 adet)', quantity: 50, unitPrice: 80 }] }),
      createInvoice({ seq: 4, client: startup, issueDate: daysAgo(50), dueDate: daysAgo(20), status: InvoiceStatus.PAID, paidAt: daysAgo(19), items: [{ description: 'Pitch Deck Tasarımı', quantity: 1, unitPrice: 5500 }, { description: 'Sunum Animasyonları', quantity: 1, unitPrice: 2000 }] }),
      createInvoice({ seq: 5, client: medya, issueDate: daysAgo(45), dueDate: daysAgo(15), status: InvoiceStatus.PAID, paidAt: daysAgo(13), items: [{ description: 'Sosyal Medya Görselleri (Aylık Paket)', quantity: 1, unitPrice: 3200 }, { description: 'Story & Reels Şablonları', quantity: 1, unitPrice: 1800 }] }),
      createInvoice({ seq: 6, client: kozan, issueDate: daysAgo(40), dueDate: daysAgo(10), status: InvoiceStatus.OVERDUE, items: [{ description: 'SEO & İçerik Danışmanlığı (2 Ay)', quantity: 2, unitPrice: 4000 }], notes: 'Aylık danışmanlık paketi.' }),
      createInvoice({ seq: 7, client: techvision, issueDate: daysAgo(20), dueDate: daysFromNow(10), status: InvoiceStatus.SENT, items: [{ description: 'Dashboard & Raporlama Modülü', quantity: 1, unitPrice: 14000 }, { description: 'API Entegrasyon Desteği', quantity: 1, unitPrice: 3000 }] }),
      createInvoice({ seq: 8, client: startup, issueDate: daysAgo(15), dueDate: daysFromNow(15), status: InvoiceStatus.SENT, items: [{ description: 'Landing Page Tasarım & Kodlama', quantity: 1, unitPrice: 7500 }] }),
      createInvoice({ seq: 9, client: medya, issueDate: daysAgo(3), dueDate: daysFromNow(27), status: InvoiceStatus.DRAFT, items: [{ description: 'Yıllık Sosyal Medya Paketi', quantity: 1, unitPrice: 36000 }], notes: 'Müşteri onayı bekleniyor.' }),
      createInvoice({ seq: 10, client: modastore, issueDate: daysAgo(1), dueDate: daysFromNow(29), status: InvoiceStatus.DRAFT, items: [{ description: 'Bahar/Yaz Koleksiyonu Kampanya Görselleri', quantity: 1, unitPrice: 8500 }, { description: 'Billboard & Afiş Tasarımları', quantity: 3, unitPrice: 1500 }] }),
    ]);

    const expenses = [
      { category: ExpenseCategory.SOFTWARE, vendor: 'Adobe Creative Cloud', amount: 2499, taxAmount: 449.82, expenseDate: daysAgo(85), status: ExpenseStatus.APPROVED, approvedAt: daysAgo(84) },
      { category: ExpenseCategory.SOFTWARE, vendor: 'Figma (Yıllık)', amount: 1450, taxAmount: 261, expenseDate: daysAgo(70), status: ExpenseStatus.APPROVED, approvedAt: daysAgo(69) },
      { category: ExpenseCategory.SOFTWARE, vendor: 'Notion Team', amount: 320, taxAmount: 57.6, expenseDate: daysAgo(55), status: ExpenseStatus.APPROVED, approvedAt: daysAgo(54) },
      { category: ExpenseCategory.SOFTWARE, vendor: 'Slack Pro', amount: 450, taxAmount: 81, expenseDate: daysAgo(25), status: ExpenseStatus.APPROVED, approvedAt: daysAgo(24) },
      { category: ExpenseCategory.SOFTWARE, vendor: 'GitHub Copilot', amount: 380, taxAmount: 68.4, expenseDate: daysAgo(10), status: ExpenseStatus.PENDING_APPROVAL },
      { category: ExpenseCategory.OFFICE, vendor: 'Ofisim Coworking', amount: 3500, taxAmount: 630, expenseDate: daysAgo(80), status: ExpenseStatus.APPROVED, approvedAt: daysAgo(79) },
      { category: ExpenseCategory.OFFICE, vendor: 'Ofisim Coworking', amount: 3500, taxAmount: 630, expenseDate: daysAgo(50), status: ExpenseStatus.APPROVED, approvedAt: daysAgo(49) },
      { category: ExpenseCategory.OFFICE, vendor: 'Ofisim Coworking', amount: 3500, taxAmount: 630, expenseDate: daysAgo(20), status: ExpenseStatus.PENDING_APPROVAL },
      { category: ExpenseCategory.OFFICE, vendor: 'Kırtasiye & Malzeme', amount: 285, taxAmount: 51.3, expenseDate: daysAgo(35), status: ExpenseStatus.APPROVED, approvedAt: daysAgo(34) },
      { category: ExpenseCategory.TRANSPORT, vendor: 'Uber Business', amount: 420, taxAmount: 75.6, expenseDate: daysAgo(65), status: ExpenseStatus.APPROVED, approvedAt: daysAgo(64) },
      { category: ExpenseCategory.TRANSPORT, vendor: 'BiTaksi', amount: 180, taxAmount: 32.4, expenseDate: daysAgo(30), status: ExpenseStatus.APPROVED, approvedAt: daysAgo(29) },
      { category: ExpenseCategory.TRANSPORT, vendor: 'THY - Ankara Toplantı', amount: 1240, taxAmount: 223.2, expenseDate: daysAgo(72), status: ExpenseStatus.APPROVED, approvedAt: daysAgo(71) },
      { category: ExpenseCategory.FOOD, vendor: 'Müşteri Yemeği - Nusr-Et', amount: 1850, taxAmount: 333, expenseDate: daysAgo(42), status: ExpenseStatus.APPROVED, approvedAt: daysAgo(41) },
      { category: ExpenseCategory.FOOD, vendor: 'Ekip Kahvaltısı', amount: 650, taxAmount: 117, expenseDate: daysAgo(15), status: ExpenseStatus.PENDING_APPROVAL },
      { category: ExpenseCategory.UTILITY, vendor: 'Turkcell Fatura', amount: 890, taxAmount: 160.2, expenseDate: daysAgo(45), status: ExpenseStatus.APPROVED, approvedAt: daysAgo(44) },
      { category: ExpenseCategory.UTILITY, vendor: 'Turkcell Fatura', amount: 890, taxAmount: 160.2, expenseDate: daysAgo(15), dueDate: daysFromNow(5), status: ExpenseStatus.PENDING_APPROVAL },
      { category: ExpenseCategory.UTILITY, vendor: 'İnternet (TurkNet)', amount: 450, taxAmount: 81, expenseDate: daysAgo(20), dueDate: daysFromNow(10), status: ExpenseStatus.PENDING_APPROVAL },
    ];

    for (const exp of expenses) {
      await this.prisma.expense.create({
        data: {
          userId: user.id,
          category: exp.category,
          vendor: exp.vendor,
          amount: exp.amount,
          taxAmount: exp.taxAmount ?? null,
          expenseDate: exp.expenseDate,
          dueDate: (exp as { dueDate?: Date }).dueDate ?? null,
          status: exp.status,
          approvedBy: exp.status === ExpenseStatus.APPROVED ? user.id : null,
          approvedAt: (exp as { approvedAt?: Date }).approvedAt ?? null,
        },
      });
    }
  }
}
