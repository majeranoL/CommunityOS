import { IsUUID } from 'class-validator';

import { IssueHouseholdCreditDto } from '../../finance/dto/issue-household-credit.dto';

export class AdminIssueHouseholdCreditDto extends IssueHouseholdCreditDto {
  @IsUUID()
  communityId!: string;
}
