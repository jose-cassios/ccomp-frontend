import { EventActivity, activitiesOverlap, buildEventActivityDays, eventActivityWeekdayLabel, groupEventActivities } from './event.model';

describe('groupEventActivities', () => {
  it('detects intersecting activity intervals but allows adjacent activities', () => {
    const first = activity({ start_date: '2026-09-12T14:00:00', end_date: '2026-09-12T15:00:00' });
    expect(activitiesOverlap(first, activity({ start_date: '2026-09-12T14:30:00', end_date: '2026-09-12T15:30:00' }))).toBe(true);
    expect(activitiesOverlap(first, activity({ start_date: '2026-09-12T15:00:00', end_date: '2026-09-12T16:00:00' }))).toBe(false);
    expect(activitiesOverlap(first, activity({ start_date: null, end_date: null }))).toBe(false);
  });
  it('builds an inclusive calendar across month boundaries even with no activities', () => {
    const days = buildEventActivityDays('2028-02-28T08:00', '2028-03-01T17:00', []);
    expect(days.map((day) => day.key)).toEqual(['2028-02-28', '2028-02-29', '2028-03-01']);
    expect(days.every((day) => day.slots.length === 0)).toBe(true);
  });

  it('keeps a single-day event as one day and ignores invalid date ranges', () => {
    expect(buildEventActivityDays('2026-09-10T08:00', '2026-09-10T18:00', [])).toHaveLength(1);
    expect(buildEventActivityDays('invalid', null, [])).toEqual([]);
    expect(buildEventActivityDays('2026-09-12', '2026-09-10', [])).toEqual([]);
  });
  const activity = (overrides: Partial<EventActivity>): EventActivity => ({
    id: overrides.id ?? 1,
    event_id: 7,
    title: overrides.title ?? 'Atividade',
    description: null,
    ...overrides,
  });

  it('should sort by date and group simultaneous activities in the same slot', () => {
    const groups = groupEventActivities([
      activity({ id: 3, title: 'Encerramento', start_date: '2026-09-12T16:00:00', end_date: '2026-09-12T17:00:00' }),
      activity({ id: 1, title: 'Palestra', start_date: '2026-09-12T14:00:00', end_date: '2026-09-12T15:00:00' }),
      activity({ id: 2, title: 'Oficina', start_date: '2026-09-12T14:00:00', end_date: '2026-09-12T15:30:00' }),
      activity({ id: 4, title: 'Pré-evento', start_date: '2026-09-11T18:00:00', end_date: '2026-09-11T19:00:00' }),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0].key).toBe('2026-09-11');
    expect(groups[1].slots).toHaveLength(2);
    expect(groups[1].slots[0].activities.map((item) => item.title)).toEqual(['Palestra', 'Oficina']);
  });

  it('should keep legacy activities without a schedule in a final fallback group', () => {
    const groups = groupEventActivities([
      activity({ id: 1, start_date: null }),
      activity({ id: 2, start_date: '2026-09-12T14:00:00' }),
    ]);

    expect(groups.at(-1)?.key).toBe('unscheduled');
    expect(groups.at(-1)?.slots[0].activities[0].id).toBe(1);
  });

  it('should expose weekday labels in Portuguese without relying on the app locale', () => {
    expect(eventActivityWeekdayLabel('2026-09-12T14:00:00')).toBe('sábado');
  });
});
