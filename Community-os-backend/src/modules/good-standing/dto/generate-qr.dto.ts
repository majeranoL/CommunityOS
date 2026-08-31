import { IsOptional, IsUUID } from 'class-validator';

export class GenerateQrDto {
  @IsOptional()
  @IsUUID()
  householdId?: string;
}
