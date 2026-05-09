import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ClientsModule } from './clients/clients.module';
import { InvoicesModule } from './invoices/invoices.module';
import { ExpensesModule } from './expenses/expenses.module';
import { AiModule } from './ai/ai.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    // .env dosyasını global olarak yükler — her modülde ConfigService kullanılabilir
    ConfigModule.forRoot({ isGlobal: true }),

    PrismaModule,
    AuthModule,
    ClientsModule,
    InvoicesModule,
    ExpensesModule,
    AiModule,
    CloudinaryModule,
    DashboardModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
