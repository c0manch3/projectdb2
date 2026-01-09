import { IsString, IsUUID, IsOptional } from 'class-validator';

export class CreateConstructionDto {
  @IsString()
  name: string;

  @IsUUID()
  projectId: string;
}

export class UpdateConstructionDto {
  @IsString()
  @IsOptional()
  name?: string;
}
