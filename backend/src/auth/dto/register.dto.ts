import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Geçerli bir email adresi girin' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Şifre en az 8 karakter olmalı' })
  password: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  companyName?: string;
}
