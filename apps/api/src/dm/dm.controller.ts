import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { DmService } from './dm.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { PostMessageDto } from '../chat/dto/post-message.dto';

@Controller('dm')
export class DmController {
  constructor(private readonly dm: DmService) {}

  @Get('threads')
  threads(@CurrentUser() user: AuthUser) {
    return this.dm.threads(user.id);
  }

  @Get(':userId')
  thread(@CurrentUser() user: AuthUser, @Param('userId') userId: string) {
    return this.dm.thread(user.id, userId);
  }

  @Post(':userId')
  @HttpCode(201)
  send(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Body() dto: PostMessageDto,
  ) {
    return this.dm.send(user.id, userId, dto.body);
  }
}
