import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateCommunityFeatureDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  config?: unknown;
}
