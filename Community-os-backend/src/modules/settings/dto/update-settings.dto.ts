import { Type } from 'class-transformer';

import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDefined,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class SettingEntryDto {
  @IsString()
  @MaxLength(100)
  key!: string;

  @IsDefined()
  value?: unknown;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  group?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class UpdateSettingsDto {
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => SettingEntryDto)
  settings!: SettingEntryDto[];
}
