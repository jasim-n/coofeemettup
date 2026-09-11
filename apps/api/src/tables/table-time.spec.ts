import {
  assertJoinableTable,
  chatClosesAt,
  isChatClosed,
  isUpcomingTable,
  MEETUP_CHAT_GRACE_MS,
} from './table-time';

describe('table-time', () => {
  const startAt = new Date('2026-12-01T15:00:00.000Z');

  it('isUpcomingTable is true before start', () => {
    expect(isUpcomingTable(startAt, startAt.getTime() - 1)).toBe(true);
  });

  it('isUpcomingTable is false at or after start', () => {
    expect(isUpcomingTable(startAt, startAt.getTime())).toBe(false);
  });

  it('assertJoinableTable rejects past open tables', () => {
    expect(() =>
      assertJoinableTable({ status: 'OPEN', startAt }, startAt.getTime()),
    ).toThrow('This table has already started');
  });

  it('chatClosesAt uses start grace when not completed', () => {
    const closesAt = chatClosesAt({
      chatClosedAt: null,
      completedAt: null,
      startAt,
    });
    expect(closesAt.getTime()).toBe(startAt.getTime() + MEETUP_CHAT_GRACE_MS);
  });

  it('isChatClosed after start grace', () => {
    const table = { chatClosedAt: null, completedAt: null, startAt };
    const afterGrace = startAt.getTime() + MEETUP_CHAT_GRACE_MS + 1;
    expect(isChatClosed(table, afterGrace).closed).toBe(true);
  });
});
