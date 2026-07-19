import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../auth/auth.types';
import type { GenderTrack } from '../../generated/prisma/client';

@Controller('events')
export class EventsController {
  constructor(
    private readonly events: EventsService,
    private readonly audit: AuditService,
  ) {}

  @Roles('ADMIN', 'ORGANIZER')
  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateEventDto) {
    const event = await this.events.create(dto);
    void this.audit.log({
      actorId: user.id,
      action: 'event.created',
      targetType: 'event',
      targetId: event.id,
      meta: { area: dto.area, pricePKR: dto.pricePKR },
    });
    return event;
  }

  /** Public browse of open events (authenticated). */
  @Get()
  browse(
    @Query('area') area?: string,
    @Query('genderTrack') genderTrack?: GenderTrack,
  ) {
    return this.events.browse({ area, genderTrack });
  }

  @Roles('ADMIN', 'ORGANIZER')
  @Get('admin/all')
  listAll() {
    return this.events.listAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.events.findOne(id);
  }

  @Roles('ADMIN', 'ORGANIZER')
  @Post(':id/cancel')
  @HttpCode(200)
  async cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const event = await this.events.cancelEvent(id);
    void this.audit.log({
      actorId: user.id,
      action: 'event.cancelled',
      targetType: 'event',
      targetId: id,
    });
    return event;
  }
}
