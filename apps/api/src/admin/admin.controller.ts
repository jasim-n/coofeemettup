import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { SetHostByPhoneDto, SetHostDto } from './dto/set-host.dto';
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

  @Get('admin/tables/:id/requests')
  requests(@Param('id') id: string) {
    return this.admin.listTableRequests(id);
  }

  @Post('admin/tables/:id/requests/:reqId/approve')
  @HttpCode(200)
  async approveRequest(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('reqId') reqId: string,
  ) {
    const r = await this.admin.approveRequest(id, reqId);
    void this.audit.log({
      actorId: user.id,
      action: 'table.request.approved',
      targetType: 'table',
      targetId: id,
    });
    return r;
  }

  @Post('admin/tables/:id/requests/:reqId/decline')
  @HttpCode(200)
  async declineRequest(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('reqId') reqId: string,
  ) {
    const r = await this.admin.declineRequest(id, reqId);
    void this.audit.log({
      actorId: user.id,
      action: 'table.request.declined',
      targetType: 'table',
      targetId: id,
    });
    return r;
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
}
