import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthRequest } from '../common/types/auth.types';
import { ExpensesService } from './expenses.service';
import { AiService } from '../ai/ai.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

@UseGuards(JwtAuthGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(
    private expenses: ExpensesService,
    private ai: AiService,
    private cloudinary: CloudinaryService,
  ) {}

  @Get()
  findAll(@Req() req: AuthRequest) {
    return this.expenses.findAll(req.user.id);
  }

  @Get('trash')
  findTrashed(@Req() req: AuthRequest) {
    return this.expenses.findTrashed(req.user.id);
  }

  @Post()
  create(@Req() req: AuthRequest, @Body() dto: CreateExpenseDto) {
    return this.expenses.create(req.user.id, dto);
  }

  @Post('scan')
  @UseInterceptors(FileInterceptor('file'))
  async scanReceipt(@UploadedFile() file: Express.Multer.File) {
    const { url } = await this.cloudinary.uploadFile(file.buffer, 'fintrack/receipts');
    const ocrResult = await this.ai.processReceipt(url);
    return { receiptUrl: url, ...ocrResult };
  }

  @Get(':id')
  findOne(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.expenses.findOne(id, req.user.id);
  }

  @Patch(':id')
  update(@Req() req: AuthRequest, @Param('id') id: string, @Body() dto: UpdateExpenseDto) {
    return this.expenses.update(id, req.user.id, dto);
  }

  @Post(':id/approve')
  approve(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.expenses.approve(id, req.user.id);
  }

  @Delete(':id')
  softDelete(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.expenses.softDelete(id, req.user.id);
  }

  @Post(':id/restore')
  restore(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.expenses.restore(id, req.user.id);
  }

  @Delete(':id/hard')
  hardDelete(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.expenses.hardDelete(id, req.user.id);
  }
}
