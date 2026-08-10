import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { SetHostByPhoneDto, SetHostDto } from './dto/set-host.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { SetUserStatusDto } from './dto/set-user-status.dto';
import { SetUserRoleDto } from './dto/set-user-role.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';
import { SetMailProviderDto } from './dto/set-mail-provider.dto';
import { TestMailDto } from './dto/test-mail.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { AuthUser } from '../auth/auth.types';

@Roles('ADMIN', 'ORGANIZER')
@Controller()
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  @Get('events/:eventId/bookings')
  bookings(@Param('eventId') eventId: string) {
    return this.admin.listEventBookings(eventId);
  }

  @Post('users/:id/host')
  @HttpCode(200)
  async setHost(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SetHostDto,
  ) {
    const result = await this.admin.setHost(id, dto.canHost);
    void this.audit.log({
      actorId: user.id,
      action: dto.canHost ? 'host.granted' : 'host.revoked',
      targetType: 'user',
      targetId: id,
    });
    return result;
  }

  @Post('admin/host')
  @HttpCode(200)
  async setHostByPhone(
    @CurrentUser() user: AuthUser,
    @Body() dto: SetHostByPhoneDto,
  ) {
    const result = await this.admin.setHostByPhone(dto.phone, dto.canHost);
    void this.audit.log({
      actorId: user.id,
      action: dto.canHost ? 'host.granted' : 'host.revoked',
      targetType: 'user',
      targetId: result.id,
    });
    return result;
  }

  @Get('admin/metrics')
  metrics() {
    return this.admin.getMetrics();
  }

  @Get('admin/tables')
  listAllTables() {
    return this.admin.listAllTables();
  }

  @Post('admin/tables/:id/cancel')
  @HttpCode(200)
  async cancelTable(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    const result = await this.admin.cancelTable(id);
    void this.audit.log({
      actorId: user.id,
      action: 'table.cancelled',
      targetType: 'table',
      targetId: id,
    });
    return result;
  }

  @Post('events/:eventId/groups')
  @HttpCode(201)
  async createGroup(
    @CurrentUser() user: AuthUser,
    @Param('eventId') eventId: string,
    @Body() dto: CreateGroupDto,
  ) {
    const group = await this.admin.createGroup(eventId, dto.userIds);
    void this.audit.log({
      actorId: user.id,
      action: 'group.created',
      targetType: 'event',
      targetId: eventId,
      meta: { size: dto.userIds.length },
    });
    void this.notifications.notifyMany(
      dto.userIds,
      'group.reveal',
      'Your group is ready! ☕',
      "We've matched you into a group — tap My Meetups to see who you'll meet.",
      { eventId },
    );
    return group;
  }

  @Get('events/:eventId/groups')
  groups(@Param('eventId') eventId: string) {
    return this.admin.listGroups(eventId);
  }

  @Post('bookings/:id/attendance')
  @HttpCode(200)
  async attendance(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: MarkAttendanceDto,
  ) {
    const booking = await this.admin.markAttendance(id, dto.status);
    void this.audit.log({
      actorId: user.id,
      action: 'attendance.marked',
      targetType: 'booking',
      targetId: id,
      meta: { status: dto.status },
    });
    return booking;
  }

  @Get('admin/users')
  listUsers(@Query() dto: ListUsersDto) {
    return this.admin.listUsers({
      q: dto.q,
      limit: dto.limit ?? 30,
      offset: dto.offset ?? 0,
    });
  }

  @Post('admin/users/:id/status')
  @HttpCode(200)
  setUserStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SetUserStatusDto,
  ) {
    return this.admin.setUserStatus(user.id, id, dto.status);
  }

  @Post('admin/users/:id/role')
  @HttpCode(200)
  setUserRole(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SetUserRoleDto,
  ) {
    return this.admin.setUserRole(user.id, id, dto.role);
  }

  @Post('admin/users/:id/revoke-verification')
  @HttpCode(200)
  revokeVerification(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.admin.revokeVerification(user.id, id);
  }

  @Patch('admin/reports/:id')
  @HttpCode(200)
  resolveReport(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ResolveReportDto,
  ) {
    return this.admin.resolveReport(user.id, id, dto.status, dto.banSubject);
  }

  // ── Table moderation ──────────────────────────────────────────────────────

  @Get('admin/tables/:id/participants')
  listParticipants(@Param('id') id: string) {
    return this.admin.listParticipants(id);
  }

  @Delete('admin/tables/:id/participants/:userId')
  @HttpCode(200)
  removeParticipant(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.admin.removeParticipant(user.id, id, userId);
  }

  @Delete('admin/tables/:id')
  @HttpCode(200)
  deleteTable(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.admin.deleteTable(user.id, id);
  }

  // ── Review moderation ─────────────────────────────────────────────────────

  @Get('admin/reviews')
  listReviews(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.admin.listReviews({
      limit: limit !== undefined ? Number(limit) : 30,
      offset: offset !== undefined ? Number(offset) : 0,
    });
  }

  @Delete('admin/reviews/:id')
  @HttpCode(200)
  deleteReview(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.admin.deleteReview(user.id, id);
  }

  // ── Mail provider (OTP sender) ─────────────────────────────────────────────

  @Get('admin/mail/provider')
  mailProvider() {
    return this.admin.mailProviderStatus();
  }

  @Post('admin/mail/provider')
  @HttpCode(200)
  async setMailProvider(
    @CurrentUser() user: AuthUser,
    @Body() dto: SetMailProviderDto,
  ) {
    const status = await this.admin.setMailProvider(dto.provider);
    void this.audit.log({
      actorId: user.id,
      action: 'mail.provider.changed',
      targetType: 'setting',
      targetId: 'mailProvider',
      meta: { provider: dto.provider },
    });
    return status;
  }

  @Post('admin/mail/test')
  @HttpCode(200)
  async testMail(
    @CurrentUser() user: AuthUser,
    @Body() dto: TestMailDto,
  ) {
    const result = await this.admin.sendTestMail(dto.email);
    void this.audit.log({
      actorId: user.id,
      action: 'mail.test.sent',
      targetType: 'setting',
      targetId: 'mailProvider',
      meta: { email: dto.email, provider: result.provider },
    });
    return result;
  }
}
