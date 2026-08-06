import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateReservationDto {
  @IsUUID()
  facilityId!: string;

  @IsUUID()
  residentId!: string;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}
