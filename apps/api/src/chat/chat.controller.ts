import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ChatService } from './chat.service';
import { PostMessageDto } from './dto/post-message.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';

@Controller('events')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get(':eventId/chat')
  get(@CurrentUser() user: AuthUser, @Param('eventId') eventId: string) {
    return this.chat.getForEvent(user.id, eventId);
  }

  @Post(':eventId/chat')
  @HttpCode(201)
  post(
    @CurrentUser() user: AuthUser,
    @Param('eventId') eventId: string,
    @Body() dto: PostMessageDto,
  ) {
    return this.chat.postForEvent(user.id, eventId, dto.body);
  }
}
