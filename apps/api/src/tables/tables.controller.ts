import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { TablesService } from './tables.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { PostMessageDto } from '../chat/dto/post-message.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';

const imageUpload = FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith('image/')),
});

const videoUpload = FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { fileSize: 40 * 1024 * 1024 },
  fileFilter: (_req, file, cb) =>
    cb(null, file.mimetype.startsWith('video/')),
});

@Controller('tables')
export class TablesController {
  constructor(private readonly tables: TablesService) {}

  @Post()
  @HttpCode(201)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTableDto) {
    return this.tables.create(user.id, dto);
  }

  /** Upload a banner/cover image → returns its URL (set as imageUrl on create/edit). */
  @Post('cover')
  @UseInterceptors(imageUpload)
  uploadCover(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file');
    return this.tables.uploadCover(user.id, file.buffer);
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

  @Get('mine/group-threads')
  groupThreads(@CurrentUser() user: AuthUser) {
    return this.tables.groupThreads(user.id);
  }

  @Get('featured')
  featured() {
    return this.tables.featuredImages();
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.tables.findOne(user.id, id);
  }

  @Patch(':id')
  @HttpCode(200)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateTableDto,
  ) {
    return this.tables.update(user.id, id, dto);
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

  @Post(':id/videos')
  @HttpCode(201)
  @UseInterceptors(videoUpload)
  addVideo(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @UploadedFile() file?: Express.Multer.File,
    @Body('caption') caption?: string,
  ) {
    if (!file) throw new BadRequestException('No file');
    return this.tables.addVideo(user.id, id, file.buffer, caption);
  }

  @Post(':id/collages')
  @HttpCode(201)
  createCollage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { imageIds?: string[]; caption?: string },
  ) {
    return this.tables.createCollage(
      user.id,
      id,
      body.imageIds ?? [],
      body.caption,
    );
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

  @Post(':id/chat/close')
  @HttpCode(200)
  closeChat(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.tables.closeChat(user.id, id);
  }

  @Get(':id/participants')
  participants(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.tables.listParticipants(user.id, id);
  }

  @Delete(':id/participants/:userId')
  @HttpCode(200)
  removeParticipant(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.tables.removeParticipant(user.id, id, userId);
  }

  @Post(':id/read')
  @HttpCode(200)
  markRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.tables.markGroupRead(user.id, id);
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
