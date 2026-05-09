import { Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

// Liste görünümünde lineItems gerekmez — sadece kart/satır bilgileri
const LIST_SELECT = {
  id: true,
  invoiceNumber: true,
  status: true,
  issueDate: true,
  dueDate: true,
  subtotal: true,
  taxRate: true,
  taxAmount: true,
  total: true,
  notes: true,
  paidAt: true,
  isDeleted: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  client: { select: { id: true, name: true } },
} as const;

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    // markOverdue arka planda çalışır — list fetch'i bloklamaz
    this.markOverdue(userId).catch(() => undefined);
    return this.prisma.invoice.findMany({
      where: { userId, isDeleted: false },
      select: LIST_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  findTrashed(userId: string) {
    return this.prisma.invoice.findMany({
      where: { userId, isDeleted: true },
      select: LIST_SELECT,
      orderBy: { deletedAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, userId, isDeleted: false },
      include: { lineItems: true, client: true },
    });
    if (!invoice) throw new NotFoundException('Fatura bulunamadı');
    return invoice;
  }

  async findOneWithUser(id: string, userId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, userId, isDeleted: false },
      include: {
        lineItems: true,
        client: true,
        user: { select: { fullName: true, companyName: true, email: true } },
      },
    });
    if (!invoice) throw new NotFoundException('Fatura bulunamadı');
    return invoice;
  }

  async markOverdue(userId: string) {
    await this.prisma.invoice.updateMany({
      where: {
        userId,
        status: InvoiceStatus.SENT,
        dueDate: { lt: new Date() },
        isDeleted: false,
      },
      data: { status: InvoiceStatus.OVERDUE },
    });
  }

  async create(userId: string, dto: CreateInvoiceDto) {
    const taxRate = dto.taxRate ?? 20;
    let subtotal: number;
    let taxAmount: number;
    let total: number;

    if (dto.taxInclusive) {
      const grossTotal = dto.lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      subtotal = Math.round((grossTotal / (1 + taxRate / 100)) * 100) / 100;
      taxAmount = Math.round((grossTotal - subtotal) * 100) / 100;
      total = grossTotal;
    } else {
      subtotal = dto.lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      taxAmount = Math.round(subtotal * taxRate * 100) / 10000;
      total = subtotal + taxAmount;
    }

    // Eş zamanlı isteklerde aynı invoiceNumber üretilebilir; @unique ihlali (P2002) olursa
    // yeni bir numara alıp tekrar dener (maks 3 deneme).
    for (let attempt = 0; attempt < 3; attempt++) {
      const invoiceNumber = await this.generateInvoiceNumber(userId);
      try {
        return await this.prisma.invoice.create({
          data: {
            userId,
            clientId: dto.clientId,
            invoiceNumber,
            issueDate: new Date(dto.issueDate),
            dueDate: new Date(dto.dueDate),
            subtotal,
            taxRate,
            taxAmount,
            total,
            notes: dto.notes,
            lineItems: {
              create: dto.lineItems.map((item) => ({
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: item.quantity * item.unitPrice,
              })),
            },
          },
          include: { lineItems: true },
        });
      } catch (err: unknown) {
        const isUniqueViolation =
          typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002';
        if (!isUniqueViolation || attempt === 2) throw err;
      }
    }
    // TypeScript için — döngü 3 denemeden sonra hata fırlatır, buraya ulaşılmaz
    throw new Error('Fatura numarası oluşturulamadı');
  }

  // updateMany: tek round-trip (findOne + update yerine)
  async markPaid(id: string, userId: string) {
    const { count } = await this.prisma.invoice.updateMany({
      where: { id, userId, isDeleted: false },
      data: { status: InvoiceStatus.PAID, paidAt: new Date() },
    });
    if (!count) throw new NotFoundException('Fatura bulunamadı');
    return { id, status: InvoiceStatus.PAID };
  }

  async softDelete(id: string, userId: string) {
    const { count } = await this.prisma.invoice.updateMany({
      where: { id, userId, isDeleted: false },
      data: { isDeleted: true, deletedAt: new Date() },
    });
    if (!count) throw new NotFoundException('Fatura bulunamadı');
    return { id };
  }

  async restore(id: string, userId: string) {
    const { count } = await this.prisma.invoice.updateMany({
      where: { id, userId, isDeleted: true },
      data: { isDeleted: false, deletedAt: null },
    });
    if (!count) throw new NotFoundException('Fatura bulunamadı');
    return { id };
  }

  async hardDelete(id: string, userId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, userId, isDeleted: true },
      select: { id: true },
    });
    if (!invoice) throw new NotFoundException('Fatura bulunamadı');
    return this.prisma.invoice.delete({ where: { id } });
  }

  private async generateInvoiceNumber(userId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.invoice.count({
      where: { userId, invoiceNumber: { startsWith: `INV-${year}-` } },
    });
    return `INV-${year}-${String(count + 1).padStart(4, '0')}`;
  }
}
