import { IsString, IsEmail, IsOptional, IsEnum } from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  name: string;

  @IsEnum(['Customer', 'Contractor'])
  type: string;

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

export class UpdateCompanyDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(['Customer', 'Contractor'])
  @IsOptional()
  type?: string;

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
