import { IsUUID } from 'class-validator';

export class ResidentParamDto {
  @IsUUID()
  id!: string;
}
