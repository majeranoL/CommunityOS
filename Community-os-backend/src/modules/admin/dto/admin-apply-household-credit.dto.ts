import { IsUUID } from 'class-validator';

import { ApplyHouseholdCreditDto } from '../../finance/dto/apply-household-credit.dto';

export class AdminApplyHouseholdCreditDto extends ApplyHouseholdCreditDto {
  @IsUUID()
  communityId!: string;
}
