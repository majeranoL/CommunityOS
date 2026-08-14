import { IsOptional, IsUUID } from 'class-validator';

export class AssignFeatureDto {
  @IsUUID()
  communityId!: string;

  @IsOptional()
  config?: unknown;
}
