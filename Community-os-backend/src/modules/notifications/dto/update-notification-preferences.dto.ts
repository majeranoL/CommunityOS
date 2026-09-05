import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { NotificationType } from '@prisma/client';

export class UpdateNotificationPreferenceEntry {
  @IsEnum(NotificationType)
  module: NotificationType;

  @IsBoolean()
  emailEnabled: boolean;

  @IsBoolean()
  pushEnabled: boolean;

  @IsBoolean()
  inAppEnabled: boolean;
}

export class UpdateNotificationPreferencesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpdateNotificationPreferenceEntry)
  preferences: UpdateNotificationPreferenceEntry[];
}