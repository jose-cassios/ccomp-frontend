export type EventCategory =
  | 'ACADEMIC_EDUCATIONAL'
  | 'CULTURE_ENTERTAINMENT'
  | 'CORPORATE_BUSINESS'
  | 'SOCIAL_POPULAR'
  | 'SPORTS_WELLNESS'
  | 'FOOD_DRINK'
  | 'OTHER';

export type EventFormat = 'IN_PERSON' | 'HYBRID' | 'ONLINE';
export type EventTiming = 'IN_PROGRESS' | 'FUTURE';

export interface EventActivity {
  id: number;
  event_id: number;
  title: string;
  description: string | null;
}

/** Resumo retornado pelo endpoint público de busca de eventos. */
export interface EventListItem {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  format: EventFormat;
  category: EventCategory;
  start_date: string | null;
  end_date: string | null;
}

/** Resposta atual de GET/POST /events e dos endpoints em /users/me. */
export interface EventResponse {
  id: number;
  title: string;
  start_date: string | null;
  end_date: string | null;
  owner_id: string;
}

/**
 * Campos adicionais são opcionais porque o Swagger ainda não os documenta no
 * endpoint de detalhes. A UI aproveita-os caso sejam disponibilizados depois.
 */
export interface EventDetails extends EventResponse {
  description?: string | null;
  format?: EventFormat;
  category?: EventCategory;
  address?: string | null;
  online_url?: string | null;
  activities?: EventActivity[];
}

export interface EventsPageResponse {
  content: EventListItem[];
  next_cursor: string | null;
  previous_cursor: string | null;
}

/** Campos aceitos por POST /events/search. */
export interface EventsFilter {
  event_category?: EventCategory;
  format?: EventFormat;
}

/** Campos aceitos por POST /events. */
export interface CreateEventPayload {
  title: string;
  category: EventCategory;
  format: EventFormat;
  start_date?: string;
  end_date?: string;
}

/** Campos aceitos por PATCH /events. */
export interface UpdateEventPayload {
  id: number;
  title?: string;
  description?: string;
  event_category?: EventCategory;
  start_date?: string;
  end_date?: string;
}

export interface ActivityPayload {
  title: string;
  description?: string;
}

export interface ApiMessage {
  response?: string;
  message?: string;
}

export function apiMessage(response: ApiMessage, fallback: string): string {
  return response.response ?? response.message ?? fallback;
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

export const EVENT_TIMING_OPTIONS: ReadonlyArray<{
  value: EventTiming;
  label: string;
}> = [
  { value: 'IN_PROGRESS', label: 'Em andamento' },
  { value: 'FUTURE', label: 'Futuros' },
];

export function eventCategoryLabel(category?: EventCategory | null): string {
  return EVENT_CATEGORY_OPTIONS.find((option) => option.value === category)?.label ?? 'Não informada';
}

export function eventFormatLabel(format?: EventFormat | null): string {
  return EVENT_FORMAT_OPTIONS.find((option) => option.value === format)?.label ?? 'Não informado';
}
