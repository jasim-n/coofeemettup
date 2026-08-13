import { IsEmail, IsIn, IsOptional } from 'class-validator';

export class RequestOtpDto {
  @IsEmail()
  email!: string;

  /** signup = create-account path; login = first-password / verification path. */
  @IsOptional()
  @IsIn(['signup', 'login'])
  intent?: 'signup' | 'login';
}
