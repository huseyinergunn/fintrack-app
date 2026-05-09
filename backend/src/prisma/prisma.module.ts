import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// @Global() — PrismaService'i her modüle import etmeden kullanılabilir hale getirir
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
