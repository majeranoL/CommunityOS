import {
  IsBoolean,
  IsDefined,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateSettingDto {
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
