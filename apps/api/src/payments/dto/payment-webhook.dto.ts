import { IsString } from 'class-validator';

export class PaymentWebhookDto {
  @IsString()
  paymentRef!: string;

  @IsString()
  status!: string;
}
