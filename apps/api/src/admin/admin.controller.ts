import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
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
