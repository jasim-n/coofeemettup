import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';

@Controller()
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get('tables/:id/review-targets')
  targets(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.reviews.targets(user.id, id);
  }

  @Post('tables/:id/reviews')
  @HttpCode(201)
  create(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviews.create(user.id, id, dto);
  }

  @Get('users/me/reviews')
  mine(@CurrentUser() user: AuthUser) {
    return this.reviews.reputation(user.id);
  }

  @Get('users/:id/reviews')
  ofUser(@Param('id') id: string) {
    return this.reviews.reputation(id);
  }
}
