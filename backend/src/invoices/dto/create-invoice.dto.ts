import { IsDateString, IsOptional, IsString, IsNumber, IsArray, ValidateNested, Min, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLineItemDto {
  @IsString()
  description: string;

  @IsNumber()
  @Min(0.01)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;
}

export class CreateInvoiceDto {
  @IsOptional()
  @IsString()
  clientId?: string;

  @IsDateString()
  issueDate: string;

  @IsDateString()
  dueDate: string;

  @IsOptional()
  @IsNumber()
  taxRate?: number; // Varsayılan: 20 (%20 KDV)

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  taxInclusive?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLineItemDto)
  lineItems: CreateLineItemDto[];
}
