import { IsString, IsEmail, IsOptional, IsEnum } from 'class-validator';
import { CompanyType } from '@prisma/client';

export class CreateCompanyDto {
  @IsString()
  name: string;

  @IsEnum(CompanyType)
  type: CompanyType;

  @IsString()
  address: string;

  @IsString()
  phone: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  account?: string;

  @IsString()
  @IsOptional()
  bank?: string;

  @IsString()
  @IsOptional()
  bik?: string;

  @IsString()
  @IsOptional()
  corrAccount?: string;

  @IsString()
  @IsOptional()
  inn?: string;

  @IsString()
  @IsOptional()
  kpp?: string;

  @IsString()
  @IsOptional()
  ogrn?: string;

  @IsString()
  @IsOptional()
  postalCode?: string;
}

export class UpdateCompanyDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(CompanyType)
  @IsOptional()
  type?: CompanyType;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  account?: string;

  @IsString()
  @IsOptional()
  bank?: string;

  @IsString()
  @IsOptional()
  bik?: string;

  @IsString()
  @IsOptional()
  corrAccount?: string;

  @IsString()
  @IsOptional()
  inn?: string;

  @IsString()
  @IsOptional()
  kpp?: string;

  @IsString()
  @IsOptional()
  ogrn?: string;

  @IsString()
  @IsOptional()
  postalCode?: string;
}
