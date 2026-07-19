import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateCafeDto {
  @IsString()
  name!: string;

  @IsString()
  area!: string;

  @IsOptional()
  @IsString()
  address?: string;

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

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deadHourSlots?: string[];

  @IsOptional()
  @IsString()
  compTerms?: string;
}
