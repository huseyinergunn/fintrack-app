import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const SOFT_DELETE_MODELS = new Set(['Invoice', 'Expense']);
const FILTER_ACTIONS = new Set(['findFirst', 'findMany', 'count', 'aggregate', 'groupBy']);

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    this.logger.log('✓ Veritabanı bağlantısı başarılı (Neon PostgreSQL)');
    this._registerSoftDeleteMiddleware();
    // Neon free tier 5 dk boşta kalınca uyuyor; 4 dk'da bir ping atarak
    // cold start gecikmesini (2-3 sn) önler.
    setInterval(() => {
      this.$queryRaw`SELECT 1`.catch(() => undefined);
    }, 4 * 60 * 1000);
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Invoice ve Expense için tüm read sorgularına otomatik isDeleted: false ekler.
   * Çöp kutusu sorguları (isDeleted: true açıkça geçilir) etkilenmez.
   */
  private _registerSoftDeleteMiddleware(): void {
    // $use Prisma 5'te deprecated ama hâlâ işlevsel; $extends PrismaClient subclass ile uyumsuz.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this as any).$use(async (params: any, next: (p: any) => Promise<unknown>) => {
      if (SOFT_DELETE_MODELS.has(params.model) && FILTER_ACTIONS.has(params.action)) {
        params.args ??= {};
        params.args.where ??= {};
        if (!Object.prototype.hasOwnProperty.call(params.args.where, 'isDeleted')) {
          params.args.where.isDeleted = false;
        }
      }
      return next(params);
    });
  }
}
