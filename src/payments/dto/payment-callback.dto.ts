import { IsString, IsOptional } from 'class-validator';

export class PaymentCallbackDto {
  @IsString()
  tran_id: string;

  @IsString()
  val_id: string;

  @IsString()
  status: string;

  @IsString()
  @IsOptional()
  amount?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  bank_tran_id?: string;

  @IsString()
  @IsOptional()
  card_type?: string;
}
