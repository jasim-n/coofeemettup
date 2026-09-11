import { BadRequestException } from '@nestjs/common';

/** Group chat stays open until this long after the scheduled start (if not completed sooner). */
export const MEETUP_CHAT_GRACE_MS = 3 * 60 * 60 * 1000;

export function isUpcomingTable(
  startAt: Date | string,
  now = Date.now(),
): boolean {
  return new Date(startAt).getTime() > now;
}

export function assertJoinableTable(
  table: { status: string; startAt: Date },
  now = Date.now(),
): void {
  if (table.status !== 'OPEN') {
    throw new BadRequestException('This table is not open for requests');
  }
  if (!isUpcomingTable(table.startAt, now)) {
    throw new BadRequestException('This table has already started');
  }
}

/** Earliest effective chat close among manual, post-complete, and post-start grace. */
export function chatClosesAt(table: {
  chatClosedAt: Date | null;
  completedAt: Date | null;
  startAt: Date;
}): Date {
  const candidates: number[] = [
    table.startAt.getTime() + MEETUP_CHAT_GRACE_MS,
  ];
  if (table.chatClosedAt) candidates.push(table.chatClosedAt.getTime());
  if (table.completedAt) {
    candidates.push(
      table.completedAt.getTime() + 24 * 60 * 60 * 1000,
    );
  }
  return new Date(Math.min(...candidates));
}

export function isChatClosed(
  table: {
    chatClosedAt: Date | null;
    completedAt: Date | null;
    startAt: Date;
  },
  now = Date.now(),
): { closed: boolean; closesAt: Date } {
  const closesAt = chatClosesAt(table);
  return { closesAt, closed: now >= closesAt.getTime() };
}
