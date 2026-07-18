import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { SafetyService } from './safety.service';
import { ReportUserDto } from './dto/report-user.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../auth/auth.types';

@Controller()
export class SafetyController {
  constructor(
    private readonly safety: SafetyService,
    private readonly audit: AuditService,
  ) {}

  @Post('users/:id/report')
  @HttpCode(201)
  async report(
    @CurrentUser() user: AuthUser,
    @Param('id') subjectId: string,
    @Body() dto: ReportUserDto,
  ) {
    const report = await this.safety.report(
      user.id,
      subjectId,
      dto.reason,
      dto.eventId,
    );
    void this.audit.log({
      actorId: user.id,
      action: 'user.reported',
      targetType: 'user',
      targetId: subjectId,
      meta: { eventId: dto.eventId },
    });
    return report;
  }

  @Post('users/:id/block')
  @HttpCode(200)
  async block(@CurrentUser() user: AuthUser, @Param('id') targetId: string) {
    const result = await this.safety.block(user.id, targetId);
    void this.audit.log({
      actorId: user.id,
      action: 'user.blocked',
      targetType: 'user',
      targetId,
    });
    return result;
  }

  @Delete('users/:id/block')
  @HttpCode(200)
  unblock(@CurrentUser() user: AuthUser, @Param('id') targetId: string) {
    return this.safety.unblock(user.id, targetId);
  }

  @Get('users/me/blocks')
  myBlocks(@CurrentUser() user: AuthUser) {
    return this.safety.listBlocks(user.id);
  }

  @Roles('ADMIN', 'ORGANIZER')
  @Get('admin/reports')
  reports() {
    return this.safety.listReports();
  }
}
