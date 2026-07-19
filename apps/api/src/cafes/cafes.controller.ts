import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CafesService } from './cafes.service';
import { CreateCafeDto } from './dto/create-cafe.dto';
import { UpdateCafeDto } from './dto/update-cafe.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../auth/auth.types';

@Roles('ADMIN', 'ORGANIZER')
@Controller('cafes')
export class CafesController {
  constructor(
    private readonly cafes: CafesService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  list() {
    return this.cafes.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.cafes.get(id);
  }

  @Post()
  @HttpCode(201)
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateCafeDto) {
    const cafe = await this.cafes.create(dto);
    void this.audit.log({
      actorId: user.id,
      action: 'cafe.created',
      targetType: 'cafe',
      targetId: cafe.id,
      meta: { name: cafe.name, area: cafe.area },
    });
    return cafe;
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCafeDto,
  ) {
    const cafe = await this.cafes.update(id, dto);
    void this.audit.log({
      actorId: user.id,
      action: 'cafe.updated',
      targetType: 'cafe',
      targetId: id,
    });
    return cafe;
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const result = await this.cafes.remove(id);
    void this.audit.log({
      actorId: user.id,
      action: 'cafe.deleted',
      targetType: 'cafe',
      targetId: id,
    });
    return result;
  }
}
