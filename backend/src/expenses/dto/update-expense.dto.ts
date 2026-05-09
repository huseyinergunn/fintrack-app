import { IsEnum, IsNumber, IsDateString, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ExpenseCategory } from '@prisma/client';

export class UpdateExpenseDto {
  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;

  @IsOptional()
  @IsString()
  vendor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @IsOptional()
  @IsDateString()
  expenseDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  receiptUrl?: string;
}
