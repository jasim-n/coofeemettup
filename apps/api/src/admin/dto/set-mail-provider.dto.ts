import { IsIn } from 'class-validator';

export class SetMailProviderDto {
  @IsIn(['brevo', 'gmail'])
  provider!: 'brevo' | 'gmail';
}
