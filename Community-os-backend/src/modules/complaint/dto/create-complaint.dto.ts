import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

import {
  ComplaintCategory,
  ComplaintPriority,
} from '@prisma/client';

export class CreateComplaintDto {
  @IsUUID()
  @IsNotEmpty()
  residentId!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsEnum(ComplaintCategory)
  category!: ComplaintCategory;

  @IsOptional()
  @IsEnum(ComplaintPriority)
  priority?: ComplaintPriority;

  @IsOptional()
  @IsString()
  remarks?: string;
}