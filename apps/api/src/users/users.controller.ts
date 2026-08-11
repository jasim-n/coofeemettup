import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UsersService } from './users.service';
import { MediaService } from '../media/media.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { toPublicUser } from './user.serializer';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';

const photoUpload = FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith('image/')),
});

@Controller('users')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly media: MediaService,
  ) {}

  @Patch('me')
  async updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return toPublicUser(await this.users.updateProfile(user.id, dto));
  }

  @Post('me/photo')
  @UseInterceptors(photoUpload)
  async uploadPhoto(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<{ photoUrl: string }> {
    if (!file) throw new BadRequestException('No file');
    const url = await this.media.uploadImage(file.buffer);
    await this.users.setPhoto(user.id, url);
    return { photoUrl: url };
  }

  @Get('me/referral')
  referral(@CurrentUser() user: AuthUser) {
    return this.users.getReferral(user.id);
  }

  @Get('search')
  search(
    @CurrentUser() me: AuthUser,
    @Query('q') q = '',
    @Query('limit') limit?: string,
  ) {
    return this.users.searchUsers(me.id, q, limit !== undefined ? Number(limit) : 20);
  }

  @Get(':id/profile')
  publicProfile(@CurrentUser() me: AuthUser, @Param('id') id: string) {
    return this.users.getPublicProfile(me.id, id);
  }
}
