import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';

@Controller('events/:eventId/feedback')
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  @Post()
  @HttpCode(201)
  submit(
    @CurrentUser() user: AuthUser,
    @Param('eventId') eventId: string,
    @Body() dto: SubmitFeedbackDto,
  ) {
    return this.feedback.submit(user.id, eventId, dto);
  }

  @Get('mine')
  getMine(@CurrentUser() user: AuthUser, @Param('eventId') eventId: string) {
    return this.feedback.getMine(user.id, eventId);
  }
}
