export type EventCategory =
  | 'ACADEMIC_EDUCATIONAL'
  | 'CULTURE_ENTERTAINMENT'
  | 'CORPORATE_BUSINESS'
  | 'SOCIAL_POPULAR'
  | 'SPORTS_WELLNESS'
  | 'FOOD_DRINK'
  | 'OTHER';

export type EventFormat = 'IN_PERSON' | 'HYBRID' | 'ONLINE';
export type EventPublicationStatus = 'DRAFT' | 'PUBLISHED' | 'UNLISTED' | 'CANCELED';
export type EventExecutionStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'FINISHED';
export type EventEnrollmentStatus = 'UPCOMING' | 'OPEN' | 'PAUSED' | 'SOLD_OUT' | 'CLOSED';
export type EventEnrollmentState = 'CONFIRMED' | 'CHECKED_IN' | 'CANCELED';
export type EventEditorStatus = 'PENDING' | 'ACTIVE' | 'REVOKED';

export type EventActivityType =
  | 'LECTURE'
  | 'WORKSHOP'
  | 'MINI_COURSE'
  | 'TALK'
  | 'TUTORIAL'
  | 'HACKATHON'
  | 'PAPER_PRESENTATION'
  | 'POSTER_SESSION'
  | 'PITCH'
  | 'CULTURAL_EVENT'
  | 'CEREMONY'
  | 'EXHIBITION'
  | 'ROUND_TABLE'
  | 'PANEL'
  | 'NETWORKING'
  | 'OTHER';
export type ActivityRegistrationMode = 'NONE' | 'REQUIRED';
export type ActivityAccessRequirement = 'EVENT_REGISTRATION' | 'PUBLIC';
export type ActivityRegistrationPolicy =
  | 'PUBLIC'
  | 'ACTIVITY_REGISTRANTS_ONLY'
  | 'INHERITED_FROM_EVENT';

export interface ActivityGuest {
  name: string;
  image_url: string | null;
}

export interface EventActivity {
  id: number;
  event_id: number;
  title: string;
  description: string | null;
  display_order?: number | null;
  type?: EventActivityType | null;
  location?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  registration_policy?: ActivityRegistrationPolicy | null;
  registration_mode?: ActivityRegistrationMode | null;
  access_requirement?: ActivityAccessRequirement | null;
  guest?: ActivityGuest | null;
  subscribed?: boolean;
  can_subscribe?: boolean | null;
  subscription_unavailable_reason?: string | null;
  enrollment_count?: number | null;
  capacity?: number | null;
}

export interface EventActivityTimeGroup {
  key: string;
  start_date: string | null;
  activities: EventActivity[];
}

export interface EventActivityDayGroup {
  key: string;
  date: string | null;
  slots: EventActivityTimeGroup[];
}

export interface EventEditor {
  id: number;
  event_id: number;
  user_id: string | null;
  name: string;
  email_address: string;
  status: EventEditorStatus;
  active: boolean;
}

export interface EventEditorsPage {
  content: EventEditor[];
  next_cursor: string | null;
}

export interface EventActivitiesPage {
  content: EventActivity[];
  next_cursor: string | null;
}

export interface EventEnrollment {
  id: number;
  status: EventEnrollmentState;
  created_at: string | null;
  user: {
    id: string;
    name: string;
    email_address: string;
  } | null;
}

export interface EventEnrollmentsPage {
  content: EventEnrollment[];
  next_cursor: string | null;
}

/** Modelo normalizado para a interface, independente do formato da resposta da API. */
export interface EventListItem {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  /** Conteúdo recebido pela listagem; também é usado pela busca global. */
  content?: string | null;
  cover_image_url?: string | null;
  format: EventFormat;
  category: EventCategory;
  start_date: string | null;
  end_date: string | null;
  status?: EventPublicationStatus | null;
  enrollment_start_date?: string | null;
  enrollment_end_date?: string | null;
}

export interface EventDetails extends EventListItem {
  schedule_conflict_policy?: 'ALLOW' | 'PREVENT' | null;
  summary?: string | null;
  content?: string | null;
  owner_id?: string | null;
  address?: string | null;
  online_url?: string | null;
  status?: EventPublicationStatus | null;
  execution_status?: EventExecutionStatus | null;
  enrollment_start_date?: string | null;
  enrollment_end_date?: string | null;
  enrollment_paused?: boolean | null;
  enrollment_status?: EventEnrollmentStatus | null;
  activities?: EventActivity[];
}

export type EventResponse = EventDetails;

export interface EventsPageResponse {
  content: EventListItem[];
  next_cursor: string | null;
  previous_cursor: string | null;
}

/** Contrato de POST /events/search. */
export interface EventsFilter {
  category?: EventCategory;
  format?: EventFormat;
}

/** Contrato de POST /events. */
export interface CreateEventPayload {
  title: string;
  category: EventCategory;
  format: EventFormat;
  start_date?: string;
  end_date?: string;
}

/** Contrato de PATCH /events/{eventId}. */
export interface UpdateEventPayload {
  schedule_conflict_policy?: 'ALLOW' | 'PREVENT';
  title?: string;
  summary?: string;
  content?: string;
  cover_image_url?: string;
  category?: EventCategory;
  format?: EventFormat;
  start_date?: string;
  end_date?: string;
  enrollment_start_date?: string;
  enrollment_end_date?: string;
  enrollment_paused?: boolean;
}

export interface CreateActivityPayload {
  title: string;
  description?: string;
}

export interface ActivityPayload extends CreateActivityPayload {
  type: EventActivityType;
  location: string;
  start_date: string;
  end_date: string;
  registration_policy: ActivityRegistrationPolicy;
}

export interface UpdateActivityPayload extends Partial<ActivityPayload> {
  display_order?: number;
}

export interface ApiMessage {
  response?: string;
  message?: string;
}

export function apiMessage(response: ApiMessage | null | undefined, fallback: string): string {
  return response?.response ?? response?.message ?? fallback;
}

export const EVENT_CATEGORY_OPTIONS: ReadonlyArray<{
  value: EventCategory;
  label: string;
}> = [
  { value: 'ACADEMIC_EDUCATIONAL', label: 'Acadêmico e educacional' },
  { value: 'CULTURE_ENTERTAINMENT', label: 'Cultura e entretenimento' },
  { value: 'CORPORATE_BUSINESS', label: 'Corporativo e negócios' },
  { value: 'SOCIAL_POPULAR', label: 'Social e comunitário' },
  { value: 'SPORTS_WELLNESS', label: 'Esporte e bem-estar' },
  { value: 'FOOD_DRINK', label: 'Gastronomia' },
  { value: 'OTHER', label: 'Outro' },
];

export const EVENT_FORMAT_OPTIONS: ReadonlyArray<{
  value: EventFormat;
  label: string;
}> = [
  { value: 'IN_PERSON', label: 'Presencial' },
  { value: 'HYBRID', label: 'Híbrido' },
  { value: 'ONLINE', label: 'Online' },
];

export const EVENT_ACTIVITY_TYPE_OPTIONS: ReadonlyArray<{
  value: EventActivityType;
  label: string;
}> = [
  { value: 'LECTURE', label: 'Palestra' },
  { value: 'WORKSHOP', label: 'Oficina' },
  { value: 'MINI_COURSE', label: 'Minicurso' },
  { value: 'TALK', label: 'Conversa' },
  { value: 'TUTORIAL', label: 'Tutorial' },
  { value: 'HACKATHON', label: 'Hackathon' },
  { value: 'PAPER_PRESENTATION', label: 'Apresentação de trabalho' },
  { value: 'POSTER_SESSION', label: 'Sessão de pôsteres' },
  { value: 'PITCH', label: 'Pitch' },
  { value: 'CULTURAL_EVENT', label: 'Atividade cultural' },
  { value: 'CEREMONY', label: 'Cerimônia' },
  { value: 'EXHIBITION', label: 'Exposição' },
  { value: 'ROUND_TABLE', label: 'Mesa-redonda' },
  { value: 'PANEL', label: 'Painel' },
  { value: 'NETWORKING', label: 'Networking' },
  { value: 'OTHER', label: 'Outra atividade' },
];

export interface ActivityRegistrationPolicyOption {
  value: ActivityRegistrationPolicy;
  label: string;
  description: string;
}

export const ACTIVITY_REGISTRATION_POLICY_OPTIONS: ReadonlyArray<ActivityRegistrationPolicyOption> = [
  {
    value: 'PUBLIC',
    label: 'Participação livre',
    description: 'A atividade é apenas divulgada: não há inscrição no evento nem nesta atividade.',
  },
  {
    value: 'ACTIVITY_REGISTRANTS_ONLY',
    label: 'Inscrição no evento e na atividade',
    description: 'A pessoa se inscreve no evento e reserva presença nesta atividade. É a opção padrão.',
  },
  {
    value: 'INHERITED_FROM_EVENT',
    label: 'Programação incluída no evento',
    description: 'Ao se inscrever no evento, a pessoa já participa desta atividade sem outra reserva.',
  },
];

export function activityRegistrationPolicyLabel(policy?: ActivityRegistrationPolicy | null): string {
  return ACTIVITY_REGISTRATION_POLICY_OPTIONS.find((option) => option.value === policy)?.label
    ?? 'Regra de participação não informada';
}

export function activityRegistrationPolicyDescription(policy?: ActivityRegistrationPolicy | null): string {
  return ACTIVITY_REGISTRATION_POLICY_OPTIONS.find((option) => option.value === policy)?.description
    ?? 'Defina como as pessoas participarão desta atividade.';
}

/** Maps the retired API value to the current default participation flow. */
export function normalizeActivityRegistrationPolicy(
  policy?: ActivityRegistrationPolicy | 'EVENT_REGISTRANTS_ONLY' | null,
): ActivityRegistrationPolicy | null {
  if (policy === 'EVENT_REGISTRANTS_ONLY') return 'ACTIVITY_REGISTRANTS_ONLY';
  return policy ?? null;
}

export const ACTIVITY_REGISTRATION_MODE_OPTIONS: ReadonlyArray<{
  value: ActivityRegistrationMode;
  label: string;
}> = [
  { value: 'NONE', label: 'Participação livre' },
  { value: 'REQUIRED', label: 'Inscrição individual' },
];

export const ACTIVITY_ACCESS_REQUIREMENT_OPTIONS: ReadonlyArray<{
  value: ActivityAccessRequirement;
  label: string;
}> = [
  { value: 'EVENT_REGISTRATION', label: 'Somente inscritos no evento' },
  { value: 'PUBLIC', label: 'Qualquer pessoa com conta' },
];

export function eventActivityTypeLabel(type?: EventActivityType | null): string {
  return EVENT_ACTIVITY_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? 'Atividade';
}

export function activityRegistrationModeLabel(mode?: ActivityRegistrationMode | null): string {
  return mode === 'REQUIRED' ? 'Inscrição individual' : 'Participação livre';
}

export function eventActivityWeekdayLabel(value?: string | null): string {
  if (!value) return 'Dia';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Dia';
  return ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][date.getDay()];
}

/** Ordena a programação e reúne atividades que começam no mesmo horário. */
export function groupEventActivities(activities: readonly EventActivity[]): EventActivityDayGroup[] {
  const scheduled = [...activities].sort((left, right) => {
    const leftStart = activityTimestamp(left.start_date);
    const rightStart = activityTimestamp(right.start_date);
    if (leftStart !== rightStart) return leftStart - rightStart;

    const leftEnd = activityTimestamp(left.end_date);
    const rightEnd = activityTimestamp(right.end_date);
    if (leftEnd !== rightEnd) return leftEnd - rightEnd;
    return left.title.localeCompare(right.title, 'pt-BR');
  });

  const days = new Map<string, EventActivityDayGroup>();
  for (const activity of scheduled) {
    const start = activity.start_date ?? null;
    const timestamp = activityTimestamp(start);
    const hasSchedule = Number.isFinite(timestamp);
    const date = hasSchedule ? start : null;
    const dayKey = hasSchedule ? localDateKey(new Date(timestamp)) : 'unscheduled';
    const slotKey = hasSchedule ? String(timestamp) : 'unscheduled';
    const day = days.get(dayKey) ?? { key: dayKey, date, slots: [] };
    let slot = day.slots.find((item) => item.key === slotKey);
    if (!slot) {
      slot = { key: slotKey, start_date: date, activities: [] };
      day.slots.push(slot);
    }
    slot.activities.push(activity);
    days.set(dayKey, day);
  }

  return [...days.values()];
}

/** Editor calendar: includes empty days and preserves legacy/out-of-range activities. */
export function buildEventActivityDays(
  start: string | null | undefined,
  end: string | null | undefined,
  activities: readonly EventActivity[],
): EventActivityDayGroup[] {
  const groups = groupEventActivities(activities);
  const first = new Date(start ?? '');
  const last = new Date(end ?? '');
  if (!Number.isFinite(first.getTime()) || !Number.isFinite(last.getTime()) || first > last) return groups;

  const byDay = new Map(groups.map((group) => [group.key, group]));
  const days: EventActivityDayGroup[] = [];
  const finalKey = localDateKey(last);
  // Calendar arithmetic, not increments of 24h (which break across daylight-saving changes).
  first.setHours(12, 0, 0, 0);
  while (localDateKey(first) <= finalKey) {
    const key = localDateKey(first);
    days.push(byDay.get(key) ?? { key, date: `${key}T12:00:00`, slots: [] });
    byDay.delete(key);
    first.setDate(first.getDate() + 1);
  }
  return [...days, ...byDay.values()];
}

/**
 * Activities collide when their occupied intervals intersect. Adjacent slots
 * (one ends exactly when the other starts) are intentionally allowed.
 */
export function activitiesOverlap(
  first: Pick<EventActivity, 'start_date' | 'end_date'>,
  second: Pick<EventActivity, 'start_date' | 'end_date'>,
): boolean {
  const firstStart = activityTimestamp(first.start_date);
  const firstEnd = activityTimestamp(first.end_date);
  const secondStart = activityTimestamp(second.start_date);
  const secondEnd = activityTimestamp(second.end_date);
  if (!Number.isFinite(firstStart) || !Number.isFinite(firstEnd)
    || !Number.isFinite(secondStart) || !Number.isFinite(secondEnd)
    || firstStart >= firstEnd || secondStart >= secondEnd) {
    return false;
  }
  return firstStart < secondEnd && secondStart < firstEnd;
}

function activityTimestamp(value?: string | null): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function eventCategoryLabel(category?: EventCategory | null): string {
  return EVENT_CATEGORY_OPTIONS.find((option) => option.value === category)?.label ?? 'Não informada';
}

export function eventFormatLabel(format?: EventFormat | null): string {
  return EVENT_FORMAT_OPTIONS.find((option) => option.value === format)?.label ?? 'Não informado';
}

export function eventPublicationStatusLabel(status?: EventPublicationStatus | null): string {
  const labels: Record<EventPublicationStatus, string> = {
    DRAFT: 'Rascunho',
    PUBLISHED: 'Publicado',
    UNLISTED: 'Não listado',
    CANCELED: 'Cancelado',
  };
  return status ? labels[status] : 'Não informado';
}

export function eventExecutionStatusLabel(status?: EventExecutionStatus | null): string {
  const labels: Record<EventExecutionStatus, string> = {
    NOT_STARTED: 'Ainda não iniciou',
    IN_PROGRESS: 'Em andamento',
    FINISHED: 'Finalizado',
  };
  return status ? labels[status] : 'Não informado';
}

export function eventEnrollmentStatusLabel(status?: EventEnrollmentStatus | null): string {
  const labels: Record<EventEnrollmentStatus, string> = {
    UPCOMING: 'Inscrições em breve',
    OPEN: 'Inscrições abertas',
    PAUSED: 'Inscrições pausadas',
    SOLD_OUT: 'Vagas esgotadas',
    CLOSED: 'Inscrições encerradas',
  };
  return status ? labels[status] : 'Inscrições indisponíveis';
}

export function eventEnrollmentStateLabel(state?: EventEnrollmentState | null): string {
  const labels: Record<EventEnrollmentState, string> = {
    CONFIRMED: 'Confirmada',
    CHECKED_IN: 'Presença confirmada',
    CANCELED: 'Cancelada',
  };
  return state ? labels[state] : 'Não informado';
}

export function eventEditorStatusLabel(status?: EventEditorStatus | null): string {
  const labels: Record<EventEditorStatus, string> = {
    PENDING: 'Convite pendente',
    ACTIVE: 'Ativo',
    REVOKED: 'Revogado',
  };
  return status ? labels[status] : 'Pendente';
}
