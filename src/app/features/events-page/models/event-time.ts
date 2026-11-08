/** API dates are wall-clock values in the event's IANA zone, never browser-local instants. */
export const DEFAULT_EVENT_TIME_ZONE = 'America/Sao_Paulo';
const COMMON_TIME_ZONES = [
  { value: 'America/Fortaleza', label: 'Maranhão / Fortaleza' },
  { value: 'America/Sao_Paulo', label: 'Brasília / São Paulo' },
  { value: 'America/Manaus', label: 'Manaus' },
  { value: 'America/Rio_Branco', label: 'Rio Branco' },
  { value: 'America/Noronha', label: 'Fernando de Noronha' },
  { value: 'UTC', label: 'UTC' },
];
const supportedZones = (Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.('timeZone') ?? [];
export const EVENT_TIME_ZONES = [...COMMON_TIME_ZONES, ...supportedZones
  .filter(zone => !COMMON_TIME_ZONES.some(item => item.value === zone))
  .map(zone => ({ value: zone, label: zone.replaceAll('_', ' ') }))];
const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(zone: string): Intl.DateTimeFormat {
  if (!formatters.has(zone)) formatters.set(zone, new Intl.DateTimeFormat('en-CA', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit',
    minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }));
  return formatters.get(zone)!;
}
export function isEventTimeZone(zone: string): boolean {
  if (!zone || zone.length > 64) return false;
  try { formatter(zone); return true; } catch { return false; }
}
function wallParts(instant: number, zone: string): number[] {
  const parts = formatter(zone).formatToParts(instant);
  return ['year', 'month', 'day', 'hour', 'minute', 'second'].map(key => Number(parts.find(p => p.type === key)?.value));
}
function wallUtc(parts: number[]): number {
  return Date.UTC(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]);
}
export function eventTimestamp(value?: string | null, zone = DEFAULT_EVENT_TIME_ZONE): number {
  if (!value) return NaN;
  if (/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)) return Date.parse(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?$/.exec(value);
  if (!match || !isEventTimeZone(zone)) return NaN;
  const parts = match.slice(1, 7).map(part => Number(part ?? 0));
  const wall = wallUtc(parts);
  let instant = wall;
  for (let i = 0; i < 4; i++) {
    const correction = wall - wallUtc(wallParts(instant, zone));
    if (!correction) break;
    instant += correction;
  }
  // Reject invalid dates and local times skipped by daylight saving changes.
  if (wallParts(instant, zone).some((part, i) => part !== parts[i])) return NaN;
  return instant + Number((match[7] ?? '').padEnd(3, '0').slice(0, 3));
}
export function eventLocalInput(value: string | null | undefined, zone = DEFAULT_EVENT_TIME_ZONE): string {
  if (!value) return '';
  if (!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)) return value.slice(0, 16);
  const instant = Date.parse(value);
  if (!Number.isFinite(instant) || !isEventTimeZone(zone)) return '';
  const [year, month, day, hour, minute] = wallParts(instant, zone).map(n => String(n).padStart(2, '0'));
  return year + '-' + month + '-' + day + 'T' + hour + ':' + minute;
}
