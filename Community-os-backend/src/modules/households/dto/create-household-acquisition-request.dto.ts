import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateHouseholdAcquisitionRequestDto {
  @IsOptional()
  @IsUUID()
  householdId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  requestedBlock?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  requestedLot?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  requestedUnit?: string;

  @IsOptional()
  @IsString()
  requestedAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
