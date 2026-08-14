import { IsNotEmpty, IsUUID } from 'class-validator';

export class TransferVehicleDto {
  @IsNotEmpty()
  @IsUUID()
  newResidentId!: string;
}
