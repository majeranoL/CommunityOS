import { IsOptional, IsUUID } from 'class-validator';

export class HouseholdCreditQueryDto {
  @IsOptional()
  @IsUUID()
  householdId?: string;
}
