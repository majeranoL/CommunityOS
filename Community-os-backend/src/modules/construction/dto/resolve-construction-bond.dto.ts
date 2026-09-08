import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';

import { ConstructionBondStatus } from '@prisma/client';

export class ResolveConstructionBondDto {
  @IsEnum(ConstructionBondStatus)
  status!: ConstructionBondStatus;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  notes!: string;
}
