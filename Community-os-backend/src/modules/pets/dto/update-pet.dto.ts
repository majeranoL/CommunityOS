import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';

import { CreatePetDto } from './create-pet.dto';

import { PetStatus } from '@prisma/client';

export class UpdatePetDto extends PartialType(CreatePetDto) {
  @IsOptional()
  @IsEnum(PetStatus)
  status?: PetStatus;
}
