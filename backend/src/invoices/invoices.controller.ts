import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Req, Res } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthRequest } from '../common/types/auth.types';
import { InvoicesService } from './invoices.service';
import { PdfService } from '../pdf/pdf.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

@UseGuards(JwtAuthGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(
    private invoices: InvoicesService,
    private pdf: PdfService,
  ) {}

  @Get()
  findAll(@Req() req: AuthRequest) {
    return this.invoices.findAll(req.user.id);
  }

  @Get('trash')
  findTrashed(@Req() req: AuthRequest) {
    return this.invoices.findTrashed(req.user.id);
  }

  @Post()
  create(@Req() req: AuthRequest, @Body() dto: CreateInvoiceDto) {
    return this.invoices.create(req.user.id, dto);
  }

  @Get(':id')
  findOne(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.invoices.findOne(id, req.user.id);
  }

  @Get(':id/pdf')
  async getPdf(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Query('inline') inline: string,
    @Res() res: Response,
  ) {
    const invoice = await this.invoices.findOneWithUser(id, req.user.id);
    const buffer = await this.pdf.generateInvoice(invoice);
    const disposition =
      inline === 'true'
        ? `inline; filename="${invoice.invoiceNumber}.pdf"`
        : `attachment; filename="${invoice.invoiceNumber}.pdf"`;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': disposition,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Post(':id/pay')
  markPaid(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.invoices.markPaid(id, req.user.id);
  }

  @Delete(':id')
  softDelete(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.invoices.softDelete(id, req.user.id);
  }

  @Post(':id/restore')
  restore(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.invoices.restore(id, req.user.id);
  }

  @Delete(':id/hard')
  hardDelete(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.invoices.hardDelete(id, req.user.id);
  }
}
