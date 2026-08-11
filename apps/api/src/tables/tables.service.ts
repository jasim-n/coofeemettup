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
import { ReactionsService } from '../reactions/reactions.service';
import { MediaService } from '../media/media.service';
import { CreateTableDto } from './dto/create-table.dto';
import { toPublicUser } from '../users/user.serializer';

const HOST_SELECT = { id: true, firstName: true, lastInitial: true };

@Injectable()
export class TablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    private readonly reactions: ReactionsService,
    private readonly media: MediaService,
  ) {}

  // ---------- host: end event + event photos ----------

  /** Host marks the event finished → status COMPLETED (unlocks reviews). */
  async complete(userId: string, tableId: string) {
    const table = await this.prisma.table.findUnique({ where: { id: tableId } });
    if (!table) throw new NotFoundException('Table not found');
    if (table.hostId !== userId) {
      throw new ForbiddenException('Only the host can end this event');
    }
    if (table.status === 'CANCELLED') {
      throw new ConflictException('This event was cancelled');
    }
    if (table.status !== 'COMPLETED') {
      await this.prisma.table.update({
        where: { id: tableId },
        data: { status: 'COMPLETED' },
      });
      void this.audit.log({
        actorId: userId,
        action: 'table.completed',
        targetType: 'table',
        targetId: tableId,
      });
    }
    return this.findOne(userId, tableId);
  }

  /** Host uploads an event photo (already stored via MediaService). */
  async addImage(userId: string, tableId: string, buffer: Buffer) {
    const table = await this.prisma.table.findUnique({ where: { id: tableId } });
    if (!table) throw new NotFoundException('Table not found');
    if (table.hostId !== userId) {
      throw new ForbiddenException('Only the host can add event photos');
    }
    const url = await this.media.uploadImage(buffer, 'table-photos');
    return this.prisma.tableImage.create({
      data: { tableId, url, uploadedById: userId },
    });
  }

  /** Any joined member (host + approved) can view the event photos. */
  async listImages(userId: string, tableId: string) {
    if (!(await this.isMember(userId, tableId))) {
      throw new ForbiddenException('Only the host and approved members can view photos');
    }
    return this.prisma.tableImage.findMany({
      where: { tableId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Only the host can remove an event photo. */
  async deleteImage(userId: string, tableId: string, imageId: string) {
    const table = await this.prisma.table.findUnique({ where: { id: tableId } });
    if (!table) throw new NotFoundException('Table not found');
    if (table.hostId !== userId) {
      throw new ForbiddenException('Only the host can remove event photos');
    }
    await this.prisma.tableImage.deleteMany({ where: { id: imageId, tableId } });
    return { ok: true as const };
  }

  /** Admin-curated featured event photos for the home "Featured" section. */
  async featuredImages() {
    const imgs = await this.prisma.tableImage.findMany({
      where: { featured: true },
      orderBy: { createdAt: 'desc' },
      take: 24,
      include: { table: { select: { id: true, title: true, category: true } } },
    });
    return imgs.map((i) => ({
      id: i.id,
      url: i.url,
      tableId: i.tableId,
      tableTitle: i.table.title,
      category: i.table.category,
    }));
  }

  // ---------- group chat threads (list + unread) ----------

  /** Group-chat conversation summaries (last message + unread) for the sidebar. */
  async groupThreads(userId: string) {
    const hosted = await this.prisma.table.findMany({
      where: { hostId: userId },
      include: { cafe: true, host: { select: HOST_SELECT } },
    });
    const approved = await this.prisma.tableJoinRequest.findMany({
      where: { userId, status: 'APPROVED' },
      include: {
        table: { include: { cafe: true, host: { select: HOST_SELECT } } },
      },
    });
    const byId = new Map<string, (typeof hosted)[number]>();
    for (const t of hosted) byId.set(t.id, t);
    for (const r of approved) if (!byId.has(r.table.id)) byId.set(r.table.id, r.table);
    const tables = [...byId.values()];
    const tableIds = tables.map((t) => t.id);
    if (tableIds.length === 0) return [];

    const messages = await this.prisma.groupMessage.findMany({
      where: { groupId: { in: tableIds } },
      orderBy: { createdAt: 'desc' },
      select: { groupId: true, body: true, userId: true, createdAt: true },
    });
    const reads = await this.prisma.groupChatRead.findMany({
      where: { userId, tableId: { in: tableIds } },
    });
    const readByTable = new Map(reads.map((r) => [r.tableId, r.lastReadAt]));

    const result = tables.map((t) => {
      const msgs = messages.filter((m) => m.groupId === t.id);
      const last = msgs[0] ?? null; // desc → first is latest
      const lastReadAt = readByTable.get(t.id) ?? new Date(0);
      const unread = msgs.filter(
        (m) => m.userId !== userId && m.createdAt > lastReadAt,
      ).length;
      return {
        table: t,
        lastMessage: last?.body ?? null,
        lastAt: (last?.createdAt ?? t.createdAt).toISOString(),
        unread,
      };
    });
    result.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
    return result;
  }

  /** Mark a table's group chat as read up to now (clears its unread count). */
  async markGroupRead(userId: string, tableId: string) {
    if (!(await this.isMember(userId, tableId))) {
      throw new ForbiddenException('Not a member of this table');
    }
    await this.prisma.groupChatRead.upsert({
      where: { userId_tableId: { userId, tableId } },
      create: { userId, tableId },
      update: { lastReadAt: new Date() },
    });
    return { ok: true as const };
  }

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
  private async savedSet(userId: string): Promise<Set<string>> {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { savedTableIds: true },
    });
    return new Set(u?.savedTableIds ?? []);
  }

  async browse(userId: string) {
    const tables = await this.prisma.table.findMany({
      where: { status: 'OPEN' },
      include: { cafe: true, host: { select: HOST_SELECT } },
      orderBy: { startAt: 'asc' },
    });
    const saved = await this.savedSet(userId);
    const ids = tables.map((t) => t.id);
    const statusBy = await this.myStatusByTable(userId, ids);
    const inviteBy = await this.myInviteByTable(userId, ids);
    return tables.map((t) => ({
      ...t,
      saved: saved.has(t.id),
      myRequestStatus: statusBy.get(t.id) ?? null,
      myInvite: inviteBy.get(t.id) ?? null,
    }));
  }

  /** The viewer's join-request status per table id (for card CTAs). */
  private async myStatusByTable(userId: string, tableIds: string[]) {
    if (tableIds.length === 0) return new Map<string, string>();
    const reqs = await this.prisma.tableJoinRequest.findMany({
      where: { userId, tableId: { in: tableIds } },
      select: { tableId: true, status: true },
    });
    return new Map(reqs.map((r) => [r.tableId, r.status]));
  }

  /** The viewer's PENDING invite (id + status) per table id. */
  private async myInviteByTable(userId: string, tableIds: string[]) {
    if (tableIds.length === 0) {
      return new Map<string, { id: string; status: string }>();
    }
    const invs = await this.prisma.tableInvite.findMany({
      where: { inviteeId: userId, tableId: { in: tableIds }, status: 'PENDING' },
      select: { id: true, tableId: true, status: true },
    });
    return new Map(invs.map((iv) => [iv.tableId, { id: iv.id, status: iv.status }]));
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
    const invite = await this.prisma.tableInvite.findUnique({
      where: { tableId_inviteeId: { tableId: id, inviteeId: userId } },
      select: { id: true, status: true },
    });
    return {
      ...table,
      myRequestStatus: mine?.status ?? null,
      myInvite:
        invite && invite.status === 'PENDING'
          ? { id: invite.id, status: invite.status }
          : null,
      saved: (await this.savedSet(userId)).has(id),
    };
  }

  async mineJoined(userId: string) {
    const reqs = await this.prisma.tableJoinRequest.findMany({
      where: { userId },
      include: {
        table: { include: { cafe: true, host: { select: HOST_SELECT } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const saved = await this.savedSet(userId);
    return reqs.map((r) => ({
      ...r.table,
      myRequestStatus: r.status,
      saved: saved.has(r.table.id),
    }));
  }

  async toggleSave(userId: string, tableId: string) {
    const table = await this.prisma.table.findUnique({ where: { id: tableId } });
    if (!table) throw new NotFoundException('Table not found');
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { savedTableIds: true },
    });
    const current = u?.savedTableIds ?? [];
    const isSaved = current.includes(tableId);
    const next = isSaved
      ? current.filter((id) => id !== tableId)
      : [...current, tableId];
    await this.prisma.user.update({
      where: { id: userId },
      data: { savedTableIds: next },
    });
    return { saved: !isSaved };
  }

  async mineSaved(userId: string) {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { savedTableIds: true },
    });
    const ids = u?.savedTableIds ?? [];
    const tables = await this.prisma.table.findMany({
      where: { id: { in: ids } },
      include: { cafe: true, host: { select: HOST_SELECT } },
      orderBy: { startAt: 'asc' },
    });
    const statusBy = await this.myStatusByTable(userId, ids);
    return tables.map((t) => ({
      ...t,
      saved: true,
      myRequestStatus: statusBy.get(t.id) ?? null,
    }));
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
    const filtered = rows.filter((r) => !blocked.has(r.userId));
    const reactionMap = await this.reactions.forMessages(
      filtered.map((r) => r.id),
      userId,
    );
    const messages = filtered.map((r) => ({
      id: r.id,
      userId: r.userId,
      body: r.body,
      createdAt: r.createdAt.toISOString(),
      firstName: byId.get(r.userId)?.firstName ?? null,
      lastInitial: byId.get(r.userId)?.lastInitial ?? null,
      reactions: reactionMap.get(r.id) ?? [],
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
