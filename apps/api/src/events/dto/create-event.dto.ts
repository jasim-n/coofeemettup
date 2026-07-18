import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { GenderTrack } from '../../../generated/prisma/client';

export class CreateEventDto {
  @IsString()
  cafeId!: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsISO8601()
  startAt!: string;

  @IsEnum(GenderTrack)
  genderTrack!: GenderTrack;

  @IsString()
  area!: string;

  @IsInt()
  @Min(2)
  capacity!: number;

  @IsInt()
  @Min(0)
  pricePKR!: number;
}
