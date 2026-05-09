import { PartialType } from '@nestjs/mapped-types';
import { CreateClientDto } from './create-client.dto';

// PartialType → CreateClientDto'daki tüm alanları opsiyonel yapar (PATCH için ideal)
export class UpdateClientDto extends PartialType(CreateClientDto) {}
