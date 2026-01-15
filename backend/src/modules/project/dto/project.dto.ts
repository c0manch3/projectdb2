import { IsString, IsOptional, IsEnum, IsDateString, Matches } from 'class-validator';
import { ProjectType, ProjectStatus } from '@prisma/client';

// UUID regex pattern that accepts any UUID-like format
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class CreateProjectDto {
  @IsString()
  name: string;

  @IsDateString()
  contractDate: string;

  @IsDateString()
  expirationDate: string;

  @IsEnum(ProjectType)
  @IsOptional()
  type?: ProjectType;

  @Matches(UUID_REGEX, { message: 'customerId must be a valid UUID format' })
  @IsOptional()
  customerId?: string;

  @Matches(UUID_REGEX, { message: 'managerId must be a valid UUID format' })
  managerId: string;

  @Matches(UUID_REGEX, { message: 'mainProjectId must be a valid UUID format' })
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

  @IsEnum(ProjectType)
  @IsOptional()
  type?: ProjectType;

  @IsEnum(ProjectStatus)
  @IsOptional()
  status?: ProjectStatus;

  @Matches(UUID_REGEX, { message: 'customerId must be a valid UUID format' })
  @IsOptional()
  customerId?: string;

  @Matches(UUID_REGEX, { message: 'managerId must be a valid UUID format' })
  @IsOptional()
  managerId?: string;

  @Matches(UUID_REGEX, { message: 'mainProjectId must be a valid UUID format' })
  @IsOptional()
  mainProjectId?: string;
}
