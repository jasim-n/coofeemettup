import {
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class CreateTableDto {
  @IsOptional()
  @IsString()
  cafeId?: string;

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

  @IsOptional()
  @IsString()
  title?: string;

  @IsISO8601()
  startAt!: string;

  @IsInt()
  @Min(2)
  @Max(50)
  seats!: number;

  @IsString()
  @Length(1, 60)
  category!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  rules?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  pricePKR?: number;
}
