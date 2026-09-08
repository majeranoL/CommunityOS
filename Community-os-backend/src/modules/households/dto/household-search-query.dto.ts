import { IsOptional, IsString, MinLength } from 'class-validator';

export class HouseholdSearchQueryDto {
  @IsString()
  @MinLength(2)
  search!: string;
}
