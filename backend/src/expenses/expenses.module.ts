import { Module } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { AiModule } from '../ai/ai.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [AiModule, CloudinaryModule],
  providers: [ExpensesService],
  controllers: [ExpensesController],
})
export class ExpensesModule {}
