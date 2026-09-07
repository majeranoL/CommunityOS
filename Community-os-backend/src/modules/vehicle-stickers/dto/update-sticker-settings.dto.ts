import {
  IsBoolean,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
} from 'class-validator';

import { Type } from 'class-transformer';

const MONTH_DAY = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export class UpdateStickerSettingsDto {
  @IsOptional()
  @IsBoolean()
  cycleEnabled?: boolean;

  @IsOptional()
  @Matches(MONTH_DAY, {
    message: 'Cycle start must use the MM-DD format (e.g. 07-15).',
  })
  cycleStart?: string;

  @IsOptional()
  @Matches(MONTH_DAY, {
    message: 'Cycle end must use the MM-DD format (e.g. 07-14).',
  })
  cycleEnd?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  maxQuantity?: number;
}
