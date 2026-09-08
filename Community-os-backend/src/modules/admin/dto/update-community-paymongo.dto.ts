import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateCommunityPayMongoDto {
  @IsString()
  @MinLength(10)
  @MaxLength(255)
  secretKey!: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  webhookSecret?: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  accountName?: string;
}
