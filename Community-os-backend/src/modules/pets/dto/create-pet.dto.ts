import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

import { PetSpecies, PetStatus } from '@prisma/client';

export class CreatePetDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsEnum(PetSpecies)
  species?: PetSpecies;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  breed?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  sex?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  color?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  photoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  registrationNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  microchipNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  vaccinationCertificateUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  rabiesCertificateUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  veterinaryCertificateUrl?: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsUUID()
  householdId?: string;

  @IsOptional()
  @IsUUID()
  residentId?: string;

  @IsOptional()
  @IsEnum(PetStatus)
  status?: PetStatus;
}
