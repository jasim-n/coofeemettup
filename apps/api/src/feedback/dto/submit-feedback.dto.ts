import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import {
  ComeAgain,
  GroupFeel,
  MeetAgain,
  SizeFeel,
} from '../../../generated/prisma/client';

export class SubmitFeedbackDto {
  @IsInt()
  @Min(1)
  @Max(5)
  enjoyment!: number;

  @IsEnum(MeetAgain)
  meetAgain!: MeetAgain;

  @IsOptional()
  @IsString()
  seeAgainNames?: string;

  @IsEnum(GroupFeel)
  mixFelt!: GroupFeel;

  @IsEnum(SizeFeel)
  sizeFelt!: SizeFeel;

  @IsInt()
  @Min(1)
  @Max(5)
  cafeRating!: number;

  @IsEnum(ComeAgain)
  comeAgain!: ComeAgain;

  @IsBoolean()
  inviteFriend!: boolean;

  @IsInt()
  @Min(0)
  @Max(10)
  nps!: number;

  @IsOptional()
  @IsBoolean()
  feltUnsafe?: boolean;

  @IsOptional()
  @IsString()
  unsafeDetails?: string;

  @IsOptional()
  @IsString()
  improve?: string;
}
