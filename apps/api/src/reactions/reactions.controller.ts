import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { ReactionsService } from './reactions.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { ToggleReactionDto } from './dto/toggle-reaction.dto';

@Controller('reactions')
export class ReactionsController {
  constructor(private readonly reactions: ReactionsService) {}

  @Post(':kind/:messageId')
  @HttpCode(200)
  toggle(
    @CurrentUser() user: AuthUser,
    @Param('kind') kind: string,
    @Param('messageId') messageId: string,
    @Body() dto: ToggleReactionDto,
  ) {
    if (kind !== 'dm' && kind !== 'group') {
      throw new BadRequestException('kind must be "dm" or "group"');
    }
    return this.reactions.toggle(user.id, kind, messageId, dto.emoji);
  }
}
