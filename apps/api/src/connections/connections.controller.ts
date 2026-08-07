import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { ConnectionsService } from './connections.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';

@Controller('connections')
export class ConnectionsController {
  constructor(private readonly connections: ConnectionsService) {}

  @Get('mine')
  myConnections(@CurrentUser() user: AuthUser) {
    return this.connections.myConnections(user.id);
  }

  @Get('requests')
  pendingReceived(@CurrentUser() user: AuthUser) {
    return this.connections.pendingReceived(user.id);
  }

  @Get('suggestions')
  suggestions(@CurrentUser() user: AuthUser) {
    return this.connections.suggestions(user.id);
  }

  @Post(':userId/request')
  @HttpCode(200)
  request(@CurrentUser() user: AuthUser, @Param('userId') userId: string) {
    return this.connections.request(user.id, userId);
  }

  @Post(':userId/accept')
  @HttpCode(200)
  accept(@CurrentUser() user: AuthUser, @Param('userId') userId: string) {
    return this.connections.accept(user.id, userId);
  }

  @Post(':userId/decline')
  @HttpCode(200)
  decline(@CurrentUser() user: AuthUser, @Param('userId') userId: string) {
    return this.connections.decline(user.id, userId);
  }

  @Delete(':userId')
  remove(@CurrentUser() user: AuthUser, @Param('userId') userId: string) {
    return this.connections.remove(user.id, userId);
  }
}
