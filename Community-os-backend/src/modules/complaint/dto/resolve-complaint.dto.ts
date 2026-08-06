import { IsOptional, IsString } from 'class-validator';

export class ResolveComplaintDto {
  @IsOptional()
  @IsString()
  resolutionRemarks?: string;
}
