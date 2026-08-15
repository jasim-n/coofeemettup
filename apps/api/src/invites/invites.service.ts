import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { InviteStatus } from '../../generated/prisma/client';
import { toPublicUser } from '../users/user.serializer';
import { CacheService } from '../redis/cache.service';

const TABLE_SELECT = {
  id: true,
  title: true,
  category: true,
  startAt: true,
  venueName: true,
} as const;

@Injectable()
export class InvitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly cache: CacheService,
  ) {}

  /** Invitees the host has already invited to this table (excludes declined). */
  async tableInvites(host: string, tableId: string) {
    const table = await this.prisma.table.findUnique({
      where: { id: tableId },
      select: { hostId: true },
    });
    if (!table) throw new NotFoundException('Table not found');
    if (table.hostId !== host) {
      throw new ForbiddenException('Only the host can view invites');
    }
    return this.prisma.tableInvite.findMany({
      where: {
        tableId,
        status: {
          in: [InviteStatus.PENDING, InviteStatus.ACCEPTED, InviteStatus.MAYBE],
        },
      },
      select: { inviteeId: true, status: true },
    });
  }

  async invite(me: string, tableId: string, inviteeId: string) {
    const table = await this.prisma.table.findUnique({
      where: { id: tableId },
    });
    if (!table) throw new NotFoundException('Table not found');

    if (table.hostId !== me) {
      throw new ForbiddenException('Only the host can invite');
    }
    if (inviteeId === me || inviteeId === table.hostId) {
      throw new BadRequestException('Invalid invitee');
    }

    const invitee = await this.prisma.user.findUnique({
      where: { id: inviteeId },
    });
    if (!invitee) throw new NotFoundException('User not found');

    await this.prisma.tableInvite.upsert({
      where: { tableId_inviteeId: { tableId, inviteeId } },
      create: {
        tableId,
        inviterId: me,
        inviteeId,
        status: InviteStatus.PENDING,
      },
      update: { status: InviteStatus.PENDING },
    });

    const inviter = await this.prisma.user.findUnique({ where: { id: me } });
    const inviterName = inviter?.username ? `@${inviter.username}` : 'The host';
    const tableTitle = table.title ?? 'a table';

    void this.notifications.create(
      inviteeId,
      'table.invite',
      "You're invited",
      `${inviterName} invited you to ${tableTitle}`,
      { tableId },
    );

    const row = await this.prisma.tableInvite.findUnique({
      where: { tableId_inviteeId: { tableId, inviteeId } },
      select: {
        id: true,
        status: true,
        createdAt: true,
        inviterId: true,
        table: { select: TABLE_SELECT },
      },
    });

    return {
      id: row!.id,
      table: row!.table,
      inviter: toPublicUser(inviter!),
      status: row!.status,
      createdAt: row!.createdAt,
    };
  }

  async mine(me: string) {
    const rows = await this.prisma.tableInvite.findMany({
      where: {
        inviteeId: me,
        status: { in: [InviteStatus.PENDING, InviteStatus.MAYBE] },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        inviterId: true,
        table: { select: TABLE_SELECT },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (rows.length === 0) return [];

    const inviterIds = [...new Set(rows.map((r) => r.inviterId))];
    const inviters = await this.prisma.user.findMany({
      where: { id: { in: inviterIds } },
    });
    const inviterById = new Map(inviters.map((u) => [u.id, u]));

    return rows.map((row) => {
      const inviter = inviterById.get(row.inviterId);
      return {
        id: row.id,
        table: row.table,
        inviter: inviter ? toPublicUser(inviter) : null,
        status: row.status,
        createdAt: row.createdAt,
      };
    });
  }

  private async loadInvite(id: string) {
    const invite = await this.prisma.tableInvite.findUnique({ where: { id } });
    if (!invite) throw new NotFoundException('Invite not found');
    return invite;
  }

  async accept(me: string, id: string) {
    const invite = await this.loadInvite(id);
    if (invite.inviteeId !== me)
      throw new ForbiddenException('Not your invite');
    if (
      invite.status !== InviteStatus.PENDING &&
      invite.status !== InviteStatus.MAYBE
    ) {
      throw new BadRequestException('Invite is not pending or maybe');
    }

    const { tableId } = invite;

    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.table.updateMany({
        where: { id: tableId, seatsLeft: { gt: 0 } },
        data: { seatsLeft: { decrement: 1 } },
      });
      if (claimed.count === 0) throw new ConflictException('Table is full');

      await tx.tableJoinRequest.upsert({
        where: { tableId_userId: { tableId, userId: me } },
        create: {
          tableId,
          userId: me,
          status: 'APPROVED',
          paymentStatus: 'PENDING',
        },
        update: { status: 'APPROVED', paymentStatus: 'PENDING' },
      });

      const fresh = await tx.table.findUnique({ where: { id: tableId } });
      if (fresh && fresh.seatsLeft <= 0) {
        await tx.table.update({
          where: { id: tableId },
          data: { status: 'FULL' },
        });
      }

      await tx.tableInvite.update({
        where: { id },
        data: { status: InviteStatus.ACCEPTED },
      });
    });

    void this.notifications.create(
      invite.inviterId,
      'table.invite.accepted',
      'Invite accepted',
      'Your invite was accepted.',
      { tableId },
    );

    const table = await this.prisma.table.findUnique({
      where: { id: tableId },
      select: { hostId: true },
    });
    void this.cache.invalidateTableMutation({
      hostId: table?.hostId,
      userIds: [me],
    });

    return { ok: true as const };
  }

  async decline(me: string, id: string) {
    const invite = await this.loadInvite(id);
    if (invite.inviteeId !== me)
      throw new ForbiddenException('Not your invite');

    await this.prisma.tableInvite.update({
      where: { id },
      data: { status: InviteStatus.DECLINED },
    });

    return { ok: true as const };
  }

  async maybe(me: string, id: string) {
    const invite = await this.loadInvite(id);
    if (invite.inviteeId !== me)
      throw new ForbiddenException('Not your invite');

    await this.prisma.tableInvite.update({
      where: { id },
      data: { status: InviteStatus.MAYBE },
    });

    return { ok: true as const };
  }
}
