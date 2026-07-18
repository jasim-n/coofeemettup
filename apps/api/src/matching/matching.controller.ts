import { Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { MatchingService } from './matching.service';
import { Roles } from '../auth/decorators/roles.decorator';

@Roles('ADMIN', 'ORGANIZER')
@Controller('events/:eventId/match')
export class MatchingController {
  constructor(private readonly matching: MatchingService) {}

  @Get('suggest')
  suggest(@Param('eventId') eventId: string) {
    return this.matching.suggest(eventId);
  }

  @Post('generate')
  @HttpCode(201)
  generate(@Param('eventId') eventId: string) {
    return this.matching.generate(eventId);
  }
}
