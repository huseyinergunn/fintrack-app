import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

// JWT'yi Authorization header yerine HTTP-Only cookie'den okur
const cookieExtractor = (req: Request): string | null => {
  return req?.cookies?.access_token ?? null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  // Token geçerliyse bu metod çalışır; dönen değer request.user'a atanır
  async validate(payload: { sub: string; email: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) throw new UnauthorizedException();
    return user; // → request.user olarak controller'a gelir
  }
}
