import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ConfigService } from '@nestjs/config';
import { DemoService } from '../demo/demo.service';

const DEMO_EMAIL = 'demo@fintrack.app';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private demo: DemoService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Bu email zaten kayıtlı');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        companyName: dto.companyName,
      },
    });

    return this.signTokens(user.id, user.email);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Email veya şifre hatalı');

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) throw new UnauthorizedException('Email veya şifre hatalı');

    if (dto.email === DEMO_EMAIL) {
      await this.demo.reset();
      const freshUser = await this.prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
      return this.signTokens(freshUser!.id, freshUser!.email);
    }

    return this.signTokens(user.id, user.email);
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify<{ sub: string; email: string }>(refreshToken, {
        secret: this.config.get<string>('JWT_SECRET'),
      });
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) throw new UnauthorizedException();
      return this.signTokens(user.id, user.email);
    } catch {
      throw new UnauthorizedException('Oturum süresi doldu, tekrar giriş yapın');
    }
  }

  private signTokens(userId: string, email: string) {
    const payload = { sub: userId, email };
    return {
      accessToken: this.jwt.sign(payload, { expiresIn: '15m' }),
      refreshToken: this.jwt.sign(payload, { expiresIn: '7d' }),
    };
  }
}
