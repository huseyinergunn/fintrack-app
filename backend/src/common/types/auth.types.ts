import { Request } from 'express';
import { User } from '@prisma/client';

/**
 * JWT strategy'nin validate() metodu tam Prisma User nesnesini döndürür.
 * Tüm controller'larda (req.user as any) yerine bu tip kullanılır.
 */
export interface AuthRequest extends Request {
  user: User;
}
