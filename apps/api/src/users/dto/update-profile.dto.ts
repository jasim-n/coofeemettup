import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  BeveragePref,
  Gender,
  Intent,
  Language,
  LifeStage,
  SocialEnergy,
} from '../../../generated/prisma/client';

export class UpdateProfileDto {
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastInitial?: string;
  @IsOptional() @IsString() ageBand?: string;
  @IsOptional() @IsEnum(Gender) gender?: Gender;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) areas?: string[];
  @IsOptional() @IsEnum(Language) language?: Language;
  @IsOptional() @IsArray() @IsString({ each: true }) availability?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) interests?: string[];
  @IsOptional() @IsEnum(LifeStage) lifeStage?: LifeStage;
  @IsOptional() @IsEnum(SocialEnergy) socialEnergy?: SocialEnergy;
  @IsOptional() @IsArray() @IsEnum(Intent, { each: true }) intents?: Intent[];
  @IsOptional() @IsString() newcomerStatus?: string;
  @IsOptional() @IsEnum(BeveragePref) beveragePref?: BeveragePref;
  @IsOptional() @IsString() accessibilityNeeds?: string;
  @IsOptional() @IsBoolean() photoConsent?: boolean;
  @IsOptional() @IsBoolean() agreeCodeOfConduct?: boolean;
}
