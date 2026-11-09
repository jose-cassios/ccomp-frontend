import { eventTimestamp, eventLocalInput, isEventTimeZone } from './event-time';

describe('Event IANA local time contract', () => {
  it('keeps a noon event ongoing at 09:10 in Fortaleza even when the server is in UTC', () => {
    const now = Date.parse('2026-11-08T12:10:00Z');
    expect(eventTimestamp('2026-11-08T09:05', 'America/Fortaleza')).toBeLessThan(now);
    expect(eventTimestamp('2026-11-08T12:00', 'America/Fortaleza')).toBe(Date.parse('2026-11-08T15:00:00Z'));
    expect(eventTimestamp('2026-11-08T12:00', 'America/Fortaleza')).toBeGreaterThan(now);
  });
  it('interprets the same wall clock differently in Manaus and Fortaleza', () => {
    expect(eventTimestamp('2026-11-08T09:00', 'America/Manaus') - eventTimestamp('2026-11-08T09:00', 'America/Fortaleza')).toBe(3600000);
  });
  it('uses seasonal IANA offsets instead of a fixed three hour shift', () => {
    expect(eventTimestamp('2026-07-01T09:00', 'America/New_York')).toBe(Date.parse('2026-07-01T13:00Z'));
    expect(eventTimestamp('2026-01-01T09:00', 'America/New_York')).toBe(Date.parse('2026-01-01T14:00Z'));
    expect(eventTimestamp('2026-03-08T02:30', 'America/New_York')).toBeNaN();
  });
  it('rejects invalid dates and zones and preserves explicit instants', () => {
    expect(isEventTimeZone('Invalid/Zone')).toBe(false);
    expect(eventTimestamp('2026-02-30T12:00')).toBeNaN();
    expect(eventTimestamp('2026-11-08T12:00', 'Invalid/Zone')).toBeNaN();
    expect(eventTimestamp('2026-11-08T12:00:00-04:00')).toBe(Date.parse('2026-11-08T16:00Z'));
  });
  it('restores form inputs in the event zone, not the browser zone', () => {
    expect(eventLocalInput('2026-11-08T16:00:00Z', 'America/Manaus')).toBe('2026-11-08T12:00');
    expect(eventLocalInput('2026-11-08T12:00:00', 'America/Manaus')).toBe('2026-11-08T12:00');
  });
});
