import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class CreatePushSubscriptionDto {
  @IsUrl({ require_protocol: true, protocols: ['https'] })
  endpoint: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  p256dh: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  auth: string;

  @IsOptional()
  @IsString()
  userAgent?: string;
}
