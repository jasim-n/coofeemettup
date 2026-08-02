import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { CreateTableDto } from './dto/create-table.dto';
import { toPublicUser } from '../users/user.serializer';

const HOST_SELECT = { id: true, firstName: true, lastInitial: true };

@Injectable()
export class TablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  // ---------- hosting ----------
  async create(userId: string, dto: CreateTableDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (!user.canHost) {
      throw new ForbiddenException('Only approved hosts can create tables');
    }
    if (!dto.cafeId && (dto.lat == null || dto.lng == null)) {
      throw new BadRequestException('Pick a cafe or drop a location pin');
    }
    if (dto.cafeId) {
      const cafe = await this.prisma.cafe.findUnique({
        where: { id: dto.cafeId },
      });
      if (!cafe) throw new NotFoundException('Cafe not found');
    }

    const table = await this.prisma.table.create({
      data: {
        hostId: userId,
        cafeId: dto.cafeId ?? null,
        venueName: dto.venueName ?? null,
        venueAddress: dto.venueAddress ?? null,
        lat: dto.lat ?? null,
        lng: dto.lng ?? null,
        title: dto.title ?? null,
        startAt: new Date(dto.startAt),
        seats: dto.seats,
        seatsLeft: dto.seats,
        category: dto.category,
        description: dto.description ?? null,
        rules: dto.rules ?? null,
        pricePKR: dto.pricePKR ?? null,
        status: 'OPEN',
      },
    });
    void this.audit.log({
      actorId: userId,
      action: 'table.created',
      targetType: 'table',
      targetId: table.id,
      meta: { category: table.category, seats: table.seats },
    });
    return table;
  }

  mineHosting(userId: string) {
    return this.prisma.table.findMany({
      where: { hostId: userId },
      include: { cafe: true, host: { select: HOST_SELECT } },
      orderBy: { startAt: 'desc' },
    });
  }

  // ---------- discovery ----------
  browse() {
    return this.prisma.table.findMany({
      where: { status: 'OPEN' },
      include: { cafe: true, host: { select: HOST_SELECT } },
      orderBy: { startAt: 'asc' },
    });
  }

  async findOne(userId: string, id: string) {
    const table = await this.prisma.table.findUnique({
      where: { id },
      include: { cafe: true, host: { select: HOST_SELECT } },
    });
    if (!table) throw new NotFoundException('Table not found');
    const mine = await this.prisma.tableJoinRequest.findUnique({
      where: { tableId_userId: { tableId: id, userId } },
    });
    return { ...table, myRequestStatus: mine?.status ?? null };
  }

  async mineJoined(userId: string) {
    const reqs = await this.prisma.tableJoinRequest.findMany({
      where: { userId },
      include: {
        table: { include: { cafe: true, host: { select: HOST_SELECT } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return reqs.map((r) => ({ ...r.table, myRequestStatus: r.status }));
  }

  // ---------- join lifecycle ----------
  async requestJoin(userId: string, tableId: string) {
    const table = await this.prisma.table.findUnique({
      where: { id: tableId },
    });
    if (!table) throw new NotFoundException('Table not found');
    if (table.status !== 'OPEN') {
      throw new BadRequestException('This table is not open for requests');
    }
    if (table.hostId === userId) {
      throw new BadRequestException('You are the host of this table');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.codeOfConductAt) {
      throw new ForbiddenException(
        'Please accept the Community Code of Conduct in your profile first.',
      );
    }

    const existing = await this.prisma.tableJoinRequest.findUnique({
      where: { tableId_userId: { tableId, userId } },
    });
    if (
      existing &&
      existing.status !== 'DECLINED' &&
      existing.status !== 'CANCELLED'
    ) {
      throw new ConflictException(
        existing.status === 'APPROVED'
          ? 'You are already in this table'
          : 'You have already requested to join',
      );
    }
    const request = existing
      ? await this.prisma.tableJoinRequest.update({
          where: { id: existing.id },
          data: { status: 'PENDING', paymentStatus: 'PENDING' },
        })
      : await this.prisma.tableJoinRequest.create({
          data: { tableId, userId },
        });

    void this.notifications.create(
      table.hostId,
      'table.request',
      'New join request',
      `${user.firstName ?? 'Someone'} asked to join your table.`,
      { tableId },
    );
    return request;
  }

  private async assertHost(tableId: string, userId: string) {
    const table = await this.prisma.table.findUnique({
      where: { id: tableId },
    });
    if (!table) throw new NotFoundException('Table not found');
    if (table.hostId !== userId) {
      throw new ForbiddenException('Only the host can manage this table');
    }
    return table;
  }

  /** Host inbox: all PENDING join requests across every table this user hosts. */
  async myRequests(userId: string) {
    const tables = await this.prisma.table.findMany({
      where: { hostId: userId },
      select: { id: true, title: true, category: true, startAt: true, venueName: true },
    });
    if (tables.length === 0) return [];
    const tableById = new Map(tables.map((t) => [t.id, t]));
    const reqs = await this.prisma.tableJoinRequest.findMany({
      where: { tableId: { in: tables.map((t) => t.id) }, status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });
    const users = await this.prisma.user.findMany({
      where: { id: { in: reqs.map((r) => r.userId) } },
    });
    const userById = new Map(users.map((u) => [u.id, u]));
    return reqs.map((r) => {
      const u = userById.get(r.userId);
      return { ...r, user: u ? toPublicUser(u) : null, table: tableById.get(r.tableId) ?? null };
    });
  }

  /** The host's pending request inbox (each with the requester's profile). */
  async listRequests(userId: string, tableId: string) {
    await this.assertHost(tableId, userId);
    const reqs = await this.prisma.tableJoinRequest.findMany({
      where: { tableId, status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });
    const users = await this.prisma.user.findMany({
      where: { id: { in: reqs.map((r) => r.userId) } },
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    return reqs.map((r) => {
      const u = byId.get(r.userId);
      return { ...r, user: u ? toPublicUser(u) : null };
    });
  }

  async approve(userId: string, tableId: string, requestId: string) {
    const table = await this.assertHost(tableId, userId);
    const req = await this.prisma.tableJoinRequest.findUnique({
      where: { id: requestId },
    });
    if (!req || req.tableId !== tableId) {
      throw new NotFoundException('Request not found');
    }
    if (req.status !== 'PENDING') {
      throw new BadRequestException('This request was already handled');
    }

    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.table.updateMany({
        where: { id: tableId, seatsLeft: { gt: 0 } },
        data: { seatsLeft: { decrement: 1 } },
      });
      if (claimed.count === 0) throw new ConflictException('Table is full');
      await tx.tableJoinRequest.update({
        where: { id: requestId },
        data: { status: 'APPROVED' },
      });
      const fresh = await tx.table.findUnique({ where: { id: tableId } });
      if (fresh && fresh.seatsLeft <= 0) {
        await tx.table.update({
          where: { id: tableId },
          data: { status: 'FULL' },
        });
      }
    });

    void this.notifications.create(
      req.userId,
      'table.approved',
      "You're in! 🎉",
      table.pricePKR
        ? 'The host approved your request — complete payment to lock your seat.'
        : 'The host approved your request. Tap the table to open the group chat.',
      { tableId },
    );
    return { ok: true as const };
  }

  async decline(userId: string, tableId: string, requestId: string) {
    await this.assertHost(tableId, userId);
    const req = await this.prisma.tableJoinRequest.findUnique({
      where: { id: requestId },
    });
    if (!req || req.tableId !== tableId) {
      throw new NotFoundException('Request not found');
    }
    if (req.status !== 'PENDING') {
      throw new BadRequestException('This request was already handled');
    }
    await this.prisma.tableJoinRequest.update({
      where: { id: requestId },
      data: { status: 'DECLINED' },
    });
    void this.notifications.create(
      req.userId,
      'table.declined',
      'Request declined',
      'The host couldn’t fit you in this time — plenty more tables to explore.',
      { tableId },
    );
    return { ok: true as const };
  }

  /** Guest cancels their own request/seat; releases a claimed seat. */
  async leave(userId: string, tableId: string) {
    const req = await this.prisma.tableJoinRequest.findUnique({
      where: { tableId_userId: { tableId, userId } },
    });
    if (!req || req.status === 'CANCELLED' || req.status === 'DECLINED') {
      throw new BadRequestException(
        'You have no active request for this table',
      );
    }
    const wasApproved = req.status === 'APPROVED';
    await this.prisma.$transaction(async (tx) => {
      await tx.tableJoinRequest.update({
        where: { id: req.id },
        data: { status: 'CANCELLED' },
      });
      if (wasApproved) {
        const table = await tx.table.findUnique({ where: { id: tableId } });
        await tx.table.update({
          where: { id: tableId },
          data: {
            seatsLeft: { increment: 1 },
            ...(table?.status === 'FULL' ? { status: 'OPEN' as const } : {}),
          },
        });
      }
    });
    return { ok: true as const };
  }

  // ---------- per-table chat (host + approved guests) ----------
  private async isMember(userId: string, tableId: string): Promise<boolean> {
    const table = await this.prisma.table.findUnique({
      where: { id: tableId },
    });
    if (!table) return false;
    if (table.hostId === userId) return true;
    const req = await this.prisma.tableJoinRequest.findUnique({
      where: { tableId_userId: { tableId, userId } },
    });
    return req?.status === 'APPROVED';
  }

  async getChat(userId: string, tableId: string) {
    if (!(await this.isMember(userId, tableId))) {
      return { member: false, messages: [] };
    }
    const me = await this.prisma.user.findUnique({ where: { id: userId } });
    const blocked = new Set(me?.blockedUserIds ?? []);
    const rows = await this.prisma.groupMessage.findMany({
      where: { groupId: tableId },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
    const users = await this.prisma.user.findMany({
      where: { id: { in: [...new Set(rows.map((r) => r.userId))] } },
      select: { id: true, firstName: true, lastInitial: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    const messages = rows
      .filter((r) => !blocked.has(r.userId))
      .map((r) => ({
        id: r.id,
        userId: r.userId,
        body: r.body,
        createdAt: r.createdAt.toISOString(),
        firstName: byId.get(r.userId)?.firstName ?? null,
        lastInitial: byId.get(r.userId)?.lastInitial ?? null,
      }));
    return { member: true, messages };
  }

  async postChat(userId: string, tableId: string, body: string) {
    if (!(await this.isMember(userId, tableId))) {
      throw new ForbiddenException(
        'Only the host and approved guests can chat',
      );
    }
    const text = body.trim();
    if (!text) throw new BadRequestException('Message cannot be empty');
    await this.prisma.groupMessage.create({
      data: { groupId: tableId, userId, body: text.slice(0, 1000) },
    });
    return { ok: true as const };
  }
}
