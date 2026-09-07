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

export interface EventActivity {
  id: number;
  event_id: number;
  title: string;
  description: string | null;
  display_order?: number | null;
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

export interface ActivityPayload {
  title: string;
  description?: string;
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
