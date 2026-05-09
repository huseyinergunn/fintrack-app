import { Injectable, NotFoundException } from '@nestjs/common';
import { ExpenseStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.expense.findMany({
      where: { userId, isDeleted: false },
      orderBy: { expenseDate: 'desc' },
    });
  }

  findTrashed(userId: string) {
    return this.prisma.expense.findMany({
      where: { userId, isDeleted: true },
      orderBy: { deletedAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, userId, isDeleted: false },
    });
    if (!expense) throw new NotFoundException('Gider bulunamadı');
    return expense;
  }

  create(userId: string, dto: CreateExpenseDto) {
    return this.prisma.expense.create({
      data: {
        ...dto,
        userId,
        expenseDate: new Date(dto.expenseDate),
        ...(dto.dueDate ? { dueDate: new Date(dto.dueDate) } : {}),
        status: ExpenseStatus.PENDING_APPROVAL,
      },
    });
  }

  async update(id: string, userId: string, dto: UpdateExpenseDto) {
    const { count } = await this.prisma.expense.updateMany({
      where: { id, userId, isDeleted: false },
      data: {
        ...dto,
        ...(dto.expenseDate ? { expenseDate: new Date(dto.expenseDate) } : {}),
        ...(dto.dueDate !== undefined ? { dueDate: dto.dueDate ? new Date(dto.dueDate) : null } : {}),
      },
    });
    if (!count) throw new NotFoundException('Gider bulunamadı');
    return this.prisma.expense.findUnique({ where: { id } });
  }

  // updateMany: tek round-trip (findUnique + update yerine)
  async approve(id: string, approverId: string) {
    const { count } = await this.prisma.expense.updateMany({
      where: { id, isDeleted: false },
      data: {
        status: ExpenseStatus.APPROVED,
        approvedBy: approverId,
        approvedAt: new Date(),
      },
    });
    if (!count) throw new NotFoundException('Gider bulunamadı');
    return { id, status: ExpenseStatus.APPROVED };
  }

  async softDelete(id: string, userId: string) {
    const { count } = await this.prisma.expense.updateMany({
      where: { id, userId, isDeleted: false },
      data: { isDeleted: true, deletedAt: new Date() },
    });
    if (!count) throw new NotFoundException('Gider bulunamadı');
    return { id };
  }

  async restore(id: string, userId: string) {
    const { count } = await this.prisma.expense.updateMany({
      where: { id, userId, isDeleted: true },
      data: { isDeleted: false, deletedAt: null },
    });
    if (!count) throw new NotFoundException('Gider bulunamadı');
    return { id };
  }

  async hardDelete(id: string, userId: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, userId, isDeleted: true },
      select: { id: true },
    });
    if (!expense) throw new NotFoundException('Gider bulunamadı');
    return this.prisma.expense.delete({ where: { id } });
  }
}
