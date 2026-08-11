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

/** All fields optional — the host edits any subset before the event starts. */
export class UpdateTableDto {
  @IsOptional() @IsString() cafeId?: string;
  @IsOptional() @IsString() venueName?: string;
  @IsOptional() @IsString() venueAddress?: string;
  @IsOptional() @IsNumber() @Min(-90) @Max(90) lat?: number;
  @IsOptional() @IsNumber() @Min(-180) @Max(180) lng?: number;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsISO8601() startAt?: string;
  @IsOptional() @IsInt() @Min(2) @Max(50) seats?: number;
  @IsOptional() @IsString() @Length(1, 200) category?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() rules?: string;
  @IsOptional() @IsInt() @Min(0) pricePKR?: number;
}
