import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConnectionStatus } from '../../generated/prisma/client';
import { toPublicUser } from '../users/user.serializer';

type ConnState = 'none' | 'pending_sent' | 'pending_received' | 'connected';

@Injectable()
export class ConnectionsService {
  constructor(private readonly prisma: PrismaService) {}

  private findPair(a: string, b: string) {
    return this.prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId: a, addresseeId: b },
          { requesterId: b, addresseeId: a },
        ],
      },
    });
  }

  async request(me: string, other: string): Promise<{ status: ConnState }> {
    if (me === other) throw new BadRequestException('Cannot connect with yourself');

    const otherUser = await this.prisma.user.findUnique({ where: { id: other } });
    if (!otherUser) throw new NotFoundException('User not found');

    const pair = await this.findPair(me, other);

    if (!pair) {
      await this.prisma.connection.create({
        data: { requesterId: me, addresseeId: other, status: ConnectionStatus.PENDING },
      });
      return { status: 'pending_sent' };
    }

    if (pair.status === ConnectionStatus.ACCEPTED) {
      return { status: 'connected' };
    }

    // PENDING and I'm the addressee → treat as mutual accept
    if (pair.status === ConnectionStatus.PENDING && pair.addresseeId === me) {
      await this.prisma.connection.update({
        where: { id: pair.id },
        data: { status: ConnectionStatus.ACCEPTED },
      });
      return { status: 'connected' };
    }

    // PENDING I already sent, or DECLINED → reset with me as requester
    await this.prisma.connection.update({
      where: { id: pair.id },
      data: { requesterId: me, addresseeId: other, status: ConnectionStatus.PENDING },
    });
    return { status: 'pending_sent' };
  }

  async accept(me: string, other: string): Promise<{ status: ConnState }> {
    const pair = await this.prisma.connection.findFirst({
      where: { requesterId: other, addresseeId: me, status: ConnectionStatus.PENDING },
    });
    if (!pair) throw new NotFoundException('Pending request not found');

    await this.prisma.connection.update({
      where: { id: pair.id },
      data: { status: ConnectionStatus.ACCEPTED },
    });
    return { status: 'connected' };
  }

  async decline(me: string, other: string): Promise<{ status: ConnState }> {
    const pair = await this.prisma.connection.findFirst({
      where: { requesterId: other, addresseeId: me, status: ConnectionStatus.PENDING },
    });
    if (!pair) throw new NotFoundException('Pending request not found');

    await this.prisma.connection.update({
      where: { id: pair.id },
      data: { status: ConnectionStatus.DECLINED },
    });
    return { status: 'none' };
  }

  async remove(me: string, other: string): Promise<{ status: ConnState }> {
    const pair = await this.findPair(me, other);
    if (!pair) return { status: 'none' };

    await this.prisma.connection.delete({ where: { id: pair.id } });
    return { status: 'none' };
  }

  async myConnections(me: string) {
    const connections = await this.prisma.connection.findMany({
      where: {
        status: ConnectionStatus.ACCEPTED,
        OR: [{ requesterId: me }, { addresseeId: me }],
      },
    });

    const otherIds = connections.map((c) =>
      c.requesterId === me ? c.addresseeId : c.requesterId,
    );

    const users = await this.prisma.user.findMany({
      where: { id: { in: otherIds } },
    });

    return users.map((u) => toPublicUser(u));
  }

  async pendingReceived(me: string) {
    const connections = await this.prisma.connection.findMany({
      where: { addresseeId: me, status: ConnectionStatus.PENDING },
      orderBy: { createdAt: 'desc' },
    });

    const requesterIds = connections.map((c) => c.requesterId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: requesterIds } },
    });
    const byId = new Map(users.map((u) => [u.id, u]));

    return connections.map((c) => {
      const requester = byId.get(c.requesterId);
      return {
        id: c.id,
        user: requester ? toPublicUser(requester) : null,
        createdAt: c.createdAt,
      };
    });
  }

  async suggestions(me: string) {
    const myConnections = await this.prisma.connection.findMany({
      where: {
        OR: [{ requesterId: me }, { addresseeId: me }],
      },
      select: { requesterId: true, addresseeId: true },
    });

    const excludedIds = new Set<string>([me]);
    for (const c of myConnections) {
      excludedIds.add(c.requesterId);
      excludedIds.add(c.addresseeId);
    }

    const users = await this.prisma.user.findMany({
      where: { id: { notIn: [...excludedIds] } },
      orderBy: { createdAt: 'desc' },
      take: 12,
    });

    return users.map((u) => ({ user: toPublicUser(u), mutuals: 0 }));
  }
}
