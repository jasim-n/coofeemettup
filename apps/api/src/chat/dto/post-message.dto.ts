import { IsString, Length } from 'class-validator';

export class PostMessageDto {
  @IsString()
  @Length(1, 1000)
  body!: string;
}
