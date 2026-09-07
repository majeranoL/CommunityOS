import { IsNotEmpty, IsUUID } from 'class-validator';

export class SwitchHouseholdDto {
  @IsNotEmpty()
  @IsUUID()
  householdId!: string;
}
