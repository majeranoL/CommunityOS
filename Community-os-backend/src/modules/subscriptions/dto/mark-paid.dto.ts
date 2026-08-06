import { IsOptional, IsString, MaxLength } from 'class-validator';

export class MarkPaidInvoiceDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  paymentMethod?: string;
}
