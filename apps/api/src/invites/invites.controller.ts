import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { InvitesService } from './invites.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { CreateInviteDto } from './dto/create-invite.dto';

@Controller('invites')
export class InvitesController {
  constructor(private readonly invites: InvitesService) {}

  @Post()
  @HttpCode(201)
  invite(@CurrentUser() user: AuthUser, @Body() dto: CreateInviteDto) {
    return this.invites.invite(user.id, dto.tableId, dto.userId);
  }

  @Get('mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.invites.mine(user.id);
  }

  @Get('table/:tableId')
  tableInvites(@CurrentUser() user: AuthUser, @Param('tableId') tableId: string) {
    return this.invites.tableInvites(user.id, tableId);
  }

  @Post(':id/accept')
  @HttpCode(200)
  accept(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.invites.accept(user.id, id);
  }

  @Post(':id/decline')
  @HttpCode(200)
  decline(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.invites.decline(user.id, id);
  }

  @Post(':id/maybe')
  @HttpCode(200)
  maybe(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.invites.maybe(user.id, id);
  }
}
