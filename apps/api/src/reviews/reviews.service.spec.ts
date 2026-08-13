import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ReviewsService } from './reviews.service';

describe('ReviewsService peer reviews', () => {
  const hostId = 'host-1';
  const guestA = 'guest-a';
  const guestB = 'guest-b';
  const outsider = 'outsider';
  const tableId = 'table-1';

  const pastStart = new Date(Date.now() - 60_000);

  function makeService() {
    const upsertCreates: Array<{
      role: string;
      subjectId: string;
      reviewerId: string;
    }> = [];
    const prisma = {
      table: {
        findUnique: jest.fn().mockResolvedValue({
          id: tableId,
          hostId,
          startAt: pastStart,
        }),
      },
      tableJoinRequest: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ userId: guestA }, { userId: guestB }]),
      },
      user: {
        findMany: jest
          .fn()
          .mockImplementation(
            ({ where }: { where: { id: { in: string[] } } }) =>
              Promise.resolve(
                where.id.in.map((id) => ({
                  id,
                  username:
                    id === hostId ? 'hosty' : id === guestA ? 'alice' : 'bob',
                })),
              ),
          ),
      },
      review: {
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn(
          (args: {
            create: { role: string; subjectId: string; reviewerId: string };
          }) => {
            upsertCreates.push(args.create);
            return Promise.resolve({ id: 'rev-1' });
          },
        ),
        aggregate: jest.fn().mockResolvedValue({
          _avg: { rating: 4.5 },
          _count: { _all: 2 },
        }),
      },
    };
    const notifications = {
      create: jest.fn().mockResolvedValue(undefined),
    };
    const service = new ReviewsService(prisma as never, notifications as never);
    return { service, prisma, notifications, upsertCreates };
  }

  it('guest targets include host and other guests', async () => {
    const { service } = makeService();
    const result = await service.targets(guestA, tableId);
    expect(result.eligible).toBe(true);
    expect(result.targets.map((t) => t.subjectId).sort()).toEqual(
      [hostId, guestB].sort(),
    );
    expect(result.targets.find((t) => t.subjectId === hostId)?.role).toBe(
      'HOST',
    );
    expect(result.targets.find((t) => t.subjectId === guestB)?.role).toBe(
      'GUEST',
    );
  });

  it('host targets include all approved guests', async () => {
    const { service } = makeService();
    const result = await service.targets(hostId, tableId);
    expect(result.targets.map((t) => t.subjectId).sort()).toEqual(
      [guestA, guestB].sort(),
    );
    expect(result.targets.every((t) => t.role === 'GUEST')).toBe(true);
  });

  it('create rejects non-participants and self-reviews', async () => {
    const { service } = makeService();
    await expect(
      service.create(outsider, tableId, { subjectId: hostId, rating: 5 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.create(guestA, tableId, { subjectId: guestA, rating: 5 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.create(guestA, tableId, { subjectId: outsider, rating: 5 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('create allows guest-to-guest and sets role from host', async () => {
    const { service, notifications, upsertCreates } = makeService();
    await service.create(guestA, tableId, {
      subjectId: guestB,
      rating: 4,
      comment: 'nice',
    });
    expect(upsertCreates[0]).toMatchObject({
      role: 'GUEST',
      subjectId: guestB,
      reviewerId: guestA,
    });

    await service.create(guestA, tableId, { subjectId: hostId, rating: 5 });
    expect(upsertCreates[1]).toMatchObject({
      role: 'HOST',
      subjectId: hostId,
    });
    expect(notifications.create).toHaveBeenCalled();
  });

  it('reputation includes overallRating and empty recent', async () => {
    const { service, prisma } = makeService();
    const rep = await service.reputation(hostId);
    expect(rep.overallRating).toEqual({ avg: 4.5, count: 2 });
    expect(rep.hostRating.count).toBe(2);
    expect(rep.guestRating.count).toBe(2);
    expect(rep.recent).toEqual([]);
    expect(prisma.review.aggregate).toHaveBeenCalledTimes(3);
  });
});
