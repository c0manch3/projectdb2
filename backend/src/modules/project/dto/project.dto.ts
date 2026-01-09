import { IsString, IsUUID, IsOptional, IsEnum, IsDateString } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  name: string;

  @IsDateString()
  contractDate: string;

  @IsDateString()
  expirationDate: string;

  @IsEnum(['main', 'additional'])
  @IsOptional()
  type?: string;

  @IsUUID()
  customerId: string;

  @IsUUID()
  managerId: string;

  @IsUUID()
  @IsOptional()
  mainProjectId?: string;
}

export class UpdateProjectDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsDateString()
  @IsOptional()
  contractDate?: string;

  @IsDateString()
  @IsOptional()
  expirationDate?: string;

  @IsEnum(['main', 'additional'])
  @IsOptional()
  type?: string;

  @IsEnum(['Active', 'Completed'])
  @IsOptional()
  status?: string;

  @IsUUID()
  @IsOptional()
  customerId?: string;

  @IsUUID()
  @IsOptional()
  managerId?: string;

  @IsUUID()
  @IsOptional()
  mainProjectId?: string;
}
