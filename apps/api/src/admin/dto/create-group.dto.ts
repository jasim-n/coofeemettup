import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class CreateGroupDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  userIds!: string[];
}
