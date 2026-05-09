import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req, HttpCode } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthRequest } from '../common/types/auth.types';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@UseGuards(JwtAuthGuard)
@Controller('clients')
export class ClientsController {
  constructor(private clients: ClientsService) {}

  @Get()
  findAll(@Req() req: AuthRequest) {
    return this.clients.findAll(req.user.id);
  }

  @Post()
  create(@Req() req: AuthRequest, @Body() dto: CreateClientDto) {
    return this.clients.create(req.user.id, dto);
  }

  @Get(':id')
  findOne(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.clients.findOne(id, req.user.id);
  }

  @Patch(':id')
  update(@Req() req: AuthRequest, @Param('id') id: string, @Body() dto: UpdateClientDto) {
    return this.clients.update(id, req.user.id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.clients.remove(id, req.user.id);
  }
}
