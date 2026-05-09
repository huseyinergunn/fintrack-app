import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Korumalı route'lara @UseGuards(JwtAuthGuard) eklemek yeterli
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
