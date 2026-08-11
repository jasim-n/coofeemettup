import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { TablesService } from './tables.service';
import { CreateTableDto } from './dto/create-table.dto';
import { PostMessageDto } from '../chat/dto/post-message.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';

const imageUpload = FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith('image/')),
});

@Controller('tables')
export class TablesController {
  constructor(private readonly tables: TablesService) {}

  @Post()
  @HttpCode(201)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTableDto) {
    return this.tables.create(user.id, dto);
  }

  @Get()
  browse(@CurrentUser() user: AuthUser) {
    return this.tables.browse(user.id);
  }

  @Get('mine/hosting')
  mineHosting(@CurrentUser() user: AuthUser) {
    return this.tables.mineHosting(user.id);
  }

  @Get('mine/joined')
  mineJoined(@CurrentUser() user: AuthUser) {
    return this.tables.mineJoined(user.id);
  }

  @Get('mine/requests')
  mineRequests(@CurrentUser() user: AuthUser) {
    return this.tables.myRequests(user.id);
  }

  @Get('mine/saved')
  mineSaved(@CurrentUser() user: AuthUser) {
    return this.tables.mineSaved(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.tables.findOne(user.id, id);
  }

  @Post(':id/join')
  @HttpCode(201)
  join(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.tables.requestJoin(user.id, id);
  }

  @Post(':id/leave')
  @HttpCode(200)
  leave(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.tables.leave(user.id, id);
  }

  @Post(':id/save')
  @HttpCode(200)
  toggleSave(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.tables.toggleSave(user.id, id);
  }

  @Get(':id/requests')
  requests(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.tables.listRequests(user.id, id);
  }

  @Post(':id/requests/:reqId/approve')
  @HttpCode(200)
  approve(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('reqId') reqId: string,
  ) {
    return this.tables.approve(user.id, id, reqId);
  }

  @Post(':id/requests/:reqId/decline')
  @HttpCode(200)
  decline(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('reqId') reqId: string,
  ) {
    return this.tables.decline(user.id, id, reqId);
  }

  @Post(':id/complete')
  @HttpCode(200)
  complete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.tables.complete(user.id, id);
  }

  @Get(':id/images')
  images(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.tables.listImages(user.id, id);
  }

  @Post(':id/images')
  @HttpCode(201)
  @UseInterceptors(imageUpload)
  addImage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file');
    return this.tables.addImage(user.id, id, file.buffer);
  }

  @Delete(':id/images/:imageId')
  @HttpCode(200)
  deleteImage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('imageId') imageId: string,
  ) {
    return this.tables.deleteImage(user.id, id, imageId);
  }

  @Get(':id/chat')
  chat(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.tables.getChat(user.id, id);
  }

  @Post(':id/chat')
  @HttpCode(201)
  postChat(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: PostMessageDto,
  ) {
    return this.tables.postChat(user.id, id, dto.body);
  }
}
