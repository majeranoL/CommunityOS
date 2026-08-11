import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

import { Gender } from '@prisma/client';

export class CreateRenterDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsUUID()
  @IsNotEmpty()
  householdId!: string;
}
