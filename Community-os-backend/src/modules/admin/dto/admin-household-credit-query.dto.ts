import { IsOptional, IsUUID } from 'class-validator';

import { HouseholdCreditQueryDto } from '../../finance/dto/household-credit-query.dto';

export class AdminHouseholdCreditQueryDto extends HouseholdCreditQueryDto {
  @IsOptional()
  @IsUUID()
  communityId?: string;
}
