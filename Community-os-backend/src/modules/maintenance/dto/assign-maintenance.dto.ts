import { IsNotEmpty, IsUUID } from 'class-validator';

export class AssignMaintenanceDto {
  @IsUUID()
  @IsNotEmpty()
  staffId!: string;
}
