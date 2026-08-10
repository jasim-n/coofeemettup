import { IsEmail } from 'class-validator';

export class TestMailDto {
  @IsEmail()
  email!: string;
}
