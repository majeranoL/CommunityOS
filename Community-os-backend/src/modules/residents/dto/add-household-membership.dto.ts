import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsUUID,
} from 'class-validator';

import { HouseholdRelationshipType } from '@prisma/client';

export class AddHouseholdMembershipDto {
  @IsNotEmpty()
  @IsUUID()
  householdId!: string;

  @IsOptional()
  @IsEnum(HouseholdRelationshipType)
  relationshipType?: HouseholdRelationshipType;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
