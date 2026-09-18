import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable, defer, expand, map, reduce, switchMap, throwError } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import {
  CreateActivityPayload,
  ApiMessage,
  CreateEventPayload,
  EventActivity,
  EventActivitiesPage,
  EventDetails,
  EventEditor,
  EventEditorStatus,
  EventEditorsPage,
  EventEnrollment,
  EventEnrollmentsPage,
  EventListItem,
  EventPublicationStatus,
  EventsFilter,
  EventsPageResponse,
  ActivityRegistrationPolicy,
  normalizeActivityRegistrationPolicy,
  UpdateActivityPayload,
  UpdateEventPayload,
} from '../models/event.model';

interface ApiEvent {
  id: number;
  title: string;
  slug: string;
  summary?: string | null;
  description?: string | null;
  content?: string | null;
  coverImageUrl?: string | null;
  cover_image_url?: string | null;
  format: EventListItem['format'];
  category: EventListItem['category'];
  startDate?: string | null;
  endDate?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  ownerId?: string | null;
  owner_id?: string | null;
  address?: string | null;
  onlineUrl?: string | null;
  online_url?: string | null;
  status?: EventDetails['status'];
  executionStatus?: EventDetails['execution_status'];
  execution_status?: EventDetails['execution_status'];
  enrollmentStartDate?: string | null;
  enrollment_start_date?: string | null;
  enrollmentEndDate?: string | null;
  enrollment_end_date?: string | null;
  enrollmentPaused?: boolean | null;
  enrollment_paused?: boolean | null;
  enrollmentStatus?: EventDetails['enrollment_status'];
  enrollment_status?: EventDetails['enrollment_status'];
  activities?: ApiEventActivity[];
}

interface ApiEventActivity {
  id: number;
  eventId?: number;
  event_id?: number;
  title?: string;
  name?: string;
  description?: string | null;
  displayOrder?: number | null;
  display_order?: number | null;
  type?: EventActivity['type'];
  activityType?: EventActivity['type'];
  activity_type?: EventActivity['type'];
  location?: string | null;
  startDate?: string | null;
  start_date?: string | null;
  endDate?: string | null;
  end_date?: string | null;
  registrationMode?: EventActivity['registration_mode'];
  registrationPolicy?: ActivityRegistrationPolicy | 'EVENT_REGISTRANTS_ONLY';
  registration_policy?: ActivityRegistrationPolicy | 'EVENT_REGISTRANTS_ONLY';
  registration_mode?: EventActivity['registration_mode'];
  accessRequirement?: EventActivity['access_requirement'];
  access_requirement?: EventActivity['access_requirement'];
  guest?: {
    name?: string;
    imageUrl?: string | null;
    image_url?: string | null;
  } | null;
  guestName?: string | null;
  guest_name?: string | null;
  guestImageUrl?: string | null;
  guest_image_url?: string | null;
  subscribed?: boolean;
  isSubscribed?: boolean;
  is_subscribed?: boolean;
  canSubscribe?: boolean | null;
  can_subscribe?: boolean | null;
  subscriptionUnavailableReason?: string | null;
  subscription_unavailable_reason?: string | null;
  enrollmentCount?: number | null;
  enrollment_count?: number | null;
  capacity?: number | null;
}

interface ApiEventsPage {
  content: ApiEvent[];
  nextCursor?: string | null;
  previousCursor?: string | null;
  next_cursor?: string | null;
  previous_cursor?: string | null;
}

interface ApiEventEditorsPage {
  content: Array<{
    id: number;
    eventId?: number;
    event_id?: number;
    user?: {
      id?: string;
      name?: string;
      emailAddress?: string | { value?: string; address?: string };
      email_address?: string;
    };
    status?: EventEditorStatus;
    active?: boolean;
  }>;
  nextCursor?: string | null;
  next_cursor?: string | null;
}

interface ApiEventActivitiesPage {
  content: ApiEventActivity[];
  nextCursor?: string | null;
  next_cursor?: string | null;
}

interface ApiEnrollment {
  id: number;
  status: EventEnrollment['status'];
  createdAt?: string | null;
  created_at?: string | null;
  user?: {
    id?: string;
    name?: string;
    emailAddress?: string | { value?: string; address?: string };
    email_address?: string;
  } | null;
}

interface ApiEnrollmentsPage {
  content: ApiEnrollment[];
  nextCursor?: string | null;
  next_cursor?: string | null;
}

@Injectable({ providedIn: 'root' })
export class EventsService {
  private readonly api = inject(ApiService);

  search(
    filter: EventsFilter = {},
    nextCursor?: string,
    pageSize = 12,
  ): Observable<EventsPageResponse> {
    let params = new HttpParams().set('pageSize', pageSize.toString());
    if (nextCursor) params = params.set('nextCursor', nextCursor);

    return this.api.post<ApiEventsPage>('/events/search', filter, { params }).pipe(
      map((page) => ({
        content: page.content.map((event) => this.toListItem(event)),
        next_cursor: page.nextCursor ?? page.next_cursor ?? null,
        previous_cursor: page.previousCursor ?? page.previous_cursor ?? null,
      })),
    );
  }

  getById(id: number | string): Observable<EventDetails> {
    return this.api.get<ApiEvent>(`/events/${encodeURIComponent(id)}`).pipe(
      map((event) => this.toDetails(event)),
    );
  }

  getBySlug(slug: string): Observable<EventDetails> {
    return this.api.get<ApiEvent>(`/events/slug/${encodeURIComponent(slug)}`).pipe(
      map((event) => this.toDetails(event)),
    );
  }

  getCreatedEvents(nextCursor?: string, pageSize = 12): Observable<EventsPageResponse> {
    return this.getUserEventsPage('/events/me/created', nextCursor, pageSize);
  }

  getMySubscriptions(nextCursor?: string, pageSize = 50): Observable<EventsPageResponse> {
    return this.getUserEventsPage('/events/me/subscriptions', nextCursor, pageSize);
  }

  isSubscribedToEvent(eventId: number): Observable<boolean> {
    return defer(() => {
      const cursors = new Set<string>();
      return this.getMySubscriptions().pipe(
        expand((page) => {
          if (page.content.some((event) => event.id === eventId) || !page.next_cursor) return EMPTY;
          if (cursors.has(page.next_cursor)) {
            return throwError(() => new Error('A API repetiu o cursor das inscrições.'));
          }
          cursors.add(page.next_cursor);
          return this.getMySubscriptions(page.next_cursor);
        }),
        reduce((found, page) => found || page.content.some((event) => event.id === eventId), false),
      );
    });
  }

  getEditableEvents(nextCursor?: string, pageSize = 50): Observable<EventsPageResponse> {
    return this.getUserEventsPage('/events/me/editors', nextCursor, pageSize);
  }

  create(payload: CreateEventPayload): Observable<EventDetails> {
    return this.api.post<ApiEvent>('/events', payload).pipe(map((event) => this.toDetails(event)));
  }

  update(id: number | string, payload: UpdateEventPayload): Observable<EventDetails> {
    return this.api.patch<ApiEvent>(`/events/${encodeURIComponent(id)}`, payload).pipe(
      map((event) => this.toDetails(event)),
    );
  }

  updateStatus(id: number | string, status: EventPublicationStatus): Observable<EventDetails> {
    const eventId = encodeURIComponent(id);
    return this.api.patch<ApiMessage>(`/events/${eventId}/status/${status}`, null).pipe(
      switchMap(() => this.getById(id)),
    );
  }

  publish(id: number | string): Observable<EventDetails> {
    return this.updateStatus(id, 'PUBLISHED');
  }

  deleteEvent(id: number | string): Observable<void> {
    return this.api.delete<void>(`/events/${encodeURIComponent(id)}`);
  }

  subscribe(id: number | string): Observable<ApiMessage> {
    return this.api.post<ApiMessage>(`/events/${encodeURIComponent(id)}/subscribe`, null);
  }

  unsubscribe(id: number | string): Observable<ApiMessage> {
    return this.api.delete<ApiMessage>(`/events/${encodeURIComponent(id)}/subscribe`);
  }

  addEditor(eventId: number | string, email: string): Observable<ApiMessage> {
    return this.api.post<ApiMessage>(
      `/events/${encodeURIComponent(eventId)}/editors/${encodeURIComponent(email)}`,
      null,
    );
  }

  removeEditor(eventId: number | string, email: string): Observable<ApiMessage> {
    return this.api.delete<ApiMessage>(
      `/events/${encodeURIComponent(eventId)}/editors/${encodeURIComponent(email)}`,
    );
  }

  acceptEditorInvitation(code: string): Observable<ApiMessage> {
    const params = new HttpParams().set('code', code);
    return this.api.get<ApiMessage>('/events/editors/accept', { params });
  }

  getEditors(eventId: number | string, cursor?: string, size = 50): Observable<EventEditorsPage> {
    let params = new HttpParams().set('size', size.toString());
    if (cursor) params = params.set('cursor', cursor);

    return this.api.get<ApiEventEditorsPage>(
      `/events/${encodeURIComponent(eventId)}/editors`,
      { params },
    ).pipe(
      map((page) => ({
        content: page.content.map((editor) => this.toEditor(editor)),
        next_cursor: page.nextCursor ?? page.next_cursor ?? null,
      })),
    );
  }

  createActivity(eventId: number | string, payload: CreateActivityPayload): Observable<EventActivity> {
    return this.api.post<ApiEventActivity>(
      `/events/${encodeURIComponent(eventId)}/activities`,
      { title: payload.title, description: payload.description },
    ).pipe(map((activity) => this.toActivity(activity, eventId)));
  }

  getActivities(eventId: number | string, cursor?: string): Observable<EventActivitiesPage> {
    let params = new HttpParams();
    if (cursor) params = params.set('cursor', cursor);

    return this.api.get<ApiEventActivitiesPage>(
      `/events/${encodeURIComponent(eventId)}/activities`,
      { params },
    ).pipe(
      map((page) => ({
        content: page.content.map((activity) => this.toActivity(activity, eventId)),
        next_cursor: page.nextCursor ?? page.next_cursor ?? null,
      })),
    );
  }

  getAllActivities(eventId: number | string): Observable<EventActivity[]> {
    return defer(() => {
      const cursors = new Set<string>();
      return this.getActivities(eventId).pipe(
        expand((page) => {
          if (!page.next_cursor) return EMPTY;
          if (cursors.has(page.next_cursor)) {
            return throwError(() => new Error('A API repetiu o cursor da programação. Tente novamente.'));
          }
          cursors.add(page.next_cursor);
          return this.getActivities(eventId, page.next_cursor);
        }),
        reduce((activities, page) => {
          const byId = new Map(activities.map((activity) => [activity.id, activity]));
          page.content.forEach((activity) => byId.set(activity.id, activity));
          return [...byId.values()];
        }, [] as EventActivity[]),
      );
    });
  }

  updateActivity(
    activityId: number | string,
    payload: UpdateActivityPayload,
  ): Observable<EventActivity> {
    return this.api.patch<ApiEventActivity>(
      `/events/activities/${encodeURIComponent(activityId)}`,
      payload,
    ).pipe(map((activity) => this.toActivity(activity)));
  }

  getEnrollments(
    eventId: number | string,
    nextCursor?: string,
    pageSize = 10,
  ): Observable<EventEnrollmentsPage> {
    let params = new HttpParams().set('pageSize', pageSize.toString());
    if (nextCursor) params = params.set('nextCursor', nextCursor);

    return this.api.get<ApiEnrollmentsPage>(
      `/events/${encodeURIComponent(eventId)}/enrollments`,
      { params },
    ).pipe(
      map((page) => ({
        content: page.content.map((enrollment) => this.toEnrollment(enrollment)),
        next_cursor: page.nextCursor ?? page.next_cursor ?? null,
      })),
    );
  }

  deleteActivity(activityId: number | string): Observable<ApiMessage> {
    return this.api.delete<ApiMessage>(`/events/activities/${encodeURIComponent(activityId)}`);
  }

  subscribeActivity(activityId: number | string): Observable<ApiMessage> {
    return this.api.post<ApiMessage>(
      `/events/activities/${encodeURIComponent(activityId)}/subscribe`,
      null,
    );
  }

  unsubscribeActivity(activityId: number | string): Observable<ApiMessage> {
    return this.api.delete<ApiMessage>(
      `/events/activities/${encodeURIComponent(activityId)}/subscribe`,
    );
  }

  private toListItem(event: ApiEvent): EventListItem {
    return {
      id: event.id,
      title: event.title,
      slug: event.slug,
      description: event.summary ?? event.description ?? null,
      cover_image_url: event.coverImageUrl ?? event.cover_image_url ?? null,
      format: event.format,
      category: event.category,
      start_date: event.startDate ?? event.start_date ?? null,
      end_date: event.endDate ?? event.end_date ?? null,
      status: event.status ?? null,
      enrollment_start_date: event.enrollmentStartDate ?? event.enrollment_start_date ?? null,
      enrollment_end_date: event.enrollmentEndDate ?? event.enrollment_end_date ?? null,
    };
  }

  private toDetails(event: ApiEvent): EventDetails {
    const listItem = this.toListItem(event);
    return {
      ...listItem,
      summary: event.summary ?? event.description ?? null,
      description: event.content ?? event.description ?? event.summary ?? null,
      content: event.content ?? null,
      owner_id: event.ownerId ?? event.owner_id ?? null,
      address: event.address ?? null,
      online_url: event.onlineUrl ?? event.online_url ?? null,
      status: event.status ?? null,
      execution_status: event.executionStatus ?? event.execution_status ?? null,
      enrollment_start_date: event.enrollmentStartDate ?? event.enrollment_start_date ?? null,
      enrollment_end_date: event.enrollmentEndDate ?? event.enrollment_end_date ?? null,
      enrollment_paused: event.enrollmentPaused ?? event.enrollment_paused ?? null,
      enrollment_status: event.enrollmentStatus ?? event.enrollment_status ?? null,
      activities: event.activities?.map((activity) => this.toActivity(activity)) ?? [],
    };
  }

  private toActivity(activity: ApiEventActivity, fallbackEventId: number | string = 0): EventActivity {
    const policy = normalizeActivityRegistrationPolicy(
      activity.registrationPolicy ?? activity.registration_policy ?? null,
    );
    const guestName = activity.guest?.name ?? activity.guestName ?? activity.guest_name ?? null;
    const guestImageUrl = activity.guest?.imageUrl
      ?? activity.guest?.image_url
      ?? activity.guestImageUrl
      ?? activity.guest_image_url
      ?? null;

    return {
      id: activity.id,
      event_id: activity.eventId ?? activity.event_id ?? Number(fallbackEventId),
      title: activity.title ?? activity.name ?? 'Atividade',
      description: activity.description ?? null,
      display_order: activity.displayOrder ?? activity.display_order ?? null,
      type: activity.type ?? activity.activityType ?? activity.activity_type ?? 'OTHER',
      location: activity.location ?? null,
      start_date: activity.startDate ?? activity.start_date ?? null,
      end_date: activity.endDate ?? activity.end_date ?? null,
      registration_policy: policy,
      // Legacy view fields are derived from the actual backend policy, not sent to the API.
      registration_mode: policy ? (policy === 'PUBLIC' ? 'NONE' : 'REQUIRED')
        : activity.registrationMode ?? activity.registration_mode ?? 'NONE',
      access_requirement: policy ? (policy === 'PUBLIC' ? 'PUBLIC' : 'EVENT_REGISTRATION')
        : activity.accessRequirement ?? activity.access_requirement ?? 'EVENT_REGISTRATION',
      guest: guestName ? { name: guestName, image_url: guestImageUrl } : null,
      subscribed: activity.subscribed ?? activity.isSubscribed ?? activity.is_subscribed,
      can_subscribe: activity.canSubscribe ?? activity.can_subscribe ?? null,
      subscription_unavailable_reason: activity.subscriptionUnavailableReason
        ?? activity.subscription_unavailable_reason
        ?? null,
      enrollment_count: activity.enrollmentCount ?? activity.enrollment_count ?? null,
      capacity: activity.capacity ?? null,
    };
  }

  private toEditor(editor: ApiEventEditorsPage['content'][number]): EventEditor {
    const emailAddress = editor.user?.emailAddress;
    const email = typeof emailAddress === 'string'
      ? emailAddress
      : emailAddress?.value ?? emailAddress?.address ?? editor.user?.email_address ?? '';

    const status = editor.status ?? (editor.active ? 'ACTIVE' : 'PENDING');

    return {
      id: editor.id,
      event_id: editor.eventId ?? editor.event_id ?? 0,
      user_id: editor.user?.id ?? null,
      name: editor.user?.name ?? 'Editor',
      email_address: email,
      status,
      active: status === 'ACTIVE',
    };
  }

  private getUserEventsPage(
    endpoint: string,
    nextCursor?: string,
    pageSize = 12,
  ): Observable<EventsPageResponse> {
    let params = new HttpParams().set('pageSize', pageSize.toString());
    if (nextCursor) params = params.set('nextCursor', nextCursor);

    return this.api.get<ApiEventsPage>(endpoint, { params }).pipe(
      map((page) => ({
        content: page.content.map((event) => this.toListItem(event)),
        next_cursor: page.nextCursor ?? page.next_cursor ?? null,
        previous_cursor: page.previousCursor ?? page.previous_cursor ?? null,
      })),
    );
  }

  private toEnrollment(enrollment: ApiEnrollment): EventEnrollment {
    const emailAddress = enrollment.user?.emailAddress;
    const email = typeof emailAddress === 'string'
      ? emailAddress
      : emailAddress?.value ?? emailAddress?.address ?? enrollment.user?.email_address ?? '';

    return {
      id: enrollment.id,
      status: enrollment.status,
      created_at: enrollment.createdAt ?? enrollment.created_at ?? null,
      user: enrollment.user
        ? {
            id: enrollment.user.id ?? '',
            name: enrollment.user.name ?? 'Participante',
            email_address: email,
          }
        : null,
    };
  }
}
