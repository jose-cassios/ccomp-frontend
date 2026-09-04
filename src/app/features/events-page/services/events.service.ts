import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, switchMap } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import {
  ActivityPayload,
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
  title: string;
  description?: string | null;
  displayOrder?: number | null;
  display_order?: number | null;
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
    return this.getUserEventsPage('/users/me/created-events', nextCursor, pageSize);
  }

  getMySubscriptions(nextCursor?: string, pageSize = 50): Observable<EventsPageResponse> {
    return this.getUserEventsPage('/users/me/events-subscriptions', nextCursor, pageSize);
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

  createActivity(eventId: number | string, payload: ActivityPayload): Observable<EventActivity> {
    return this.api.post<ApiEventActivity>(
      `/events/${encodeURIComponent(eventId)}/activities`,
      payload,
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
    return {
      id: activity.id,
      event_id: activity.eventId ?? activity.event_id ?? Number(fallbackEventId),
      title: activity.title,
      description: activity.description ?? null,
      display_order: activity.displayOrder ?? activity.display_order ?? null,
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
