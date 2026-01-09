import { IsString, IsOptional, Matches } from 'class-validator';

// UUID regex pattern that accepts any UUID-like format
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class CreateConstructionDto {
  @IsString()
  name: string;

  @Matches(UUID_REGEX, { message: 'projectId must be a valid UUID format' })
  projectId: string;
}

export class UpdateConstructionDto {
  @IsString()
  @IsOptional()
  name?: string;
}
