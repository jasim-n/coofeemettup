import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Max,
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

  // Optional one-off location — overrides the cafe on the map + detail when set.
  @IsOptional()
  @IsString()
  venueName?: string;

  @IsOptional()
  @IsString()
  venueAddress?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;
}
