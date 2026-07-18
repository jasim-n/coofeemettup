import { HealthController } from './health.controller';
import type { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  it('reports db up when the query succeeds', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    } as unknown as PrismaService;
    const controller = new HealthController(prisma);
    const res = await controller.check();
    expect(res.status).toBe('ok');
    expect(res.db).toBe('up');
  });

  it('reports db down when the query throws', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockRejectedValue(new Error('no db')),
    } as unknown as PrismaService;
    const controller = new HealthController(prisma);
    const res = await controller.check();
    expect(res.db).toBe('down');
  });
});
