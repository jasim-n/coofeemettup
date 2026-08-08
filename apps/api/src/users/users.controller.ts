import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { toPublicUser } from './user.serializer';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Patch('me')
  async updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return toPublicUser(await this.users.updateProfile(user.id, dto));
  }

  @Get('me/referral')
  referral(@CurrentUser() user: AuthUser) {
    return this.users.getReferral(user.id);
  }

  @Get(':id/profile')
  publicProfile(@CurrentUser() me: AuthUser, @Param('id') id: string) {
    return this.users.getPublicProfile(me.id, id);
  }
}
