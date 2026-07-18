import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { createReadStream, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import { VerificationService } from './verification.service';
import { VerifyDto } from './dto/verify.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { AuthUser } from '../auth/auth.types';

const cnicUpload = FileInterceptor('image', {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      const dir = join(process.cwd(), 'uploads', 'cnic');
      mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) =>
      cb(null, `${randomUUID()}${extname(file.originalname)}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith('image/')),
});

@Controller()
export class VerificationController {
  constructor(
    private readonly verification: VerificationService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  @Post('users/me/cnic')
  @UseInterceptors(cnicUpload)
  async uploadCnic(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<{ status: string }> {
    if (!file) throw new BadRequestException('An image file is required');
    const result = await this.verification.submit(
      user.id,
      `cnic/${file.filename}`,
    );
    void this.audit.log({
      actorId: user.id,
      action: 'cnic.submitted',
      targetType: 'user',
      targetId: user.id,
    });
    return result;
  }

  @Roles('ADMIN', 'ORGANIZER')
  @Get('admin/verifications')
  pending() {
    return this.verification.listPending();
  }

  @Roles('ADMIN', 'ORGANIZER')
  @Get('admin/verifications/:userId/image')
  async image(
    @Param('userId') userId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const abs = await this.verification.imageAbsPath(userId);
    const type =
      extname(abs).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
    res.set({ 'Content-Type': type });
    return new StreamableFile(createReadStream(abs));
  }

  @Roles('ADMIN', 'ORGANIZER')
  @Post('users/:id/verify')
  async verify(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: VerifyDto,
  ) {
    const result = await this.verification.verify(id, dto.approve);
    void this.audit.log({
      actorId: user.id,
      action: 'user.verified',
      targetType: 'user',
      targetId: id,
      meta: { approve: dto.approve },
    });
    void this.notifications.create(
      id,
      'verification',
      dto.approve ? "You're verified! ✅" : 'Verification needs another try',
      dto.approve
        ? 'Your identity has been verified — you now have the verified badge.'
        : "We couldn't verify your CNIC. Please re-upload a clear photo.",
    );
    return result;
  }
}
