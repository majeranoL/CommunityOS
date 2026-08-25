import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export const FACILITY_ITEM_CATEGORIES = [
  'CHAIRS',
  'TABLES',
  'TENTS',
  'SOUND_SYSTEM',
  'LIGHTING',
  'KITCHEN',
  'SPORTS',
  'OTHER',
] as const;

export type FacilityItemCategory = (typeof FACILITY_ITEM_CATEGORIES)[number];

export class CreateFacilityItemDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsIn(FACILITY_ITEM_CATEGORIES)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @IsInt()
  @Min(0)
  quantityTotal!: number;

  // Optional price per unit per borrowing. Omit/null = free to borrow.
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  borrowFee?: number | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateFacilityItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsIn(FACILITY_ITEM_CATEGORIES)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  quantityTotal?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  borrowFee?: number | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class BorrowItemDto {
  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  purpose?: string;

  @IsString()
  neededFrom!: string;

  @IsString()
  neededUntil!: string;
}

export class ItemLoanQueryDto {
  @IsOptional()
  @IsIn(['ALL', 'PENDING', 'APPROVED', 'RETURNED', 'REJECTED', 'CANCELLED'])
  status?: string;

  @IsOptional()
  @IsIn(['true', 'false'])
  mine?: string;
}

export class RejectLoanDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class LoanRemarksDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string;
}
