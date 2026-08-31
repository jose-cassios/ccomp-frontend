import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import {
  ActivityPayload,
  ApiMessage,
  CreateEventPayload,
  EventActivity,
  EventActivitiesPage,
  EventDetails,
  EventEditor,
  EventEditorsPage,
  EventListItem,
  EventsFilter,
  EventsPageResponse,
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
  enrollmentCount?: number | null;
  enrollment_count?: number | null;
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
  activities?: ApiEventActivity[];
}

interface ApiEventActivity {
  id: number;
  eventId?: number;
  event_id?: number;
  title: string;
  description?: string | null;
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
      name?: string;
      emailAddress?: string;
      email_address?: string;
    };
    active: boolean;
  }>;
  nextCursor?: string | null;
  next_cursor?: string | null;
}

interface ApiEventActivitiesPage {
  content: ApiEventActivity[];
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

  getCreatedEvents(): Observable<EventListItem[]> {
    return this.api.get<ApiEvent[]>('/users/me/created-events').pipe(
      map((events) => events.map((event) => this.toListItem(event))),
    );
  }

  getSubscriptions(): Observable<EventListItem[]> {
    return this.api.get<ApiEvent[]>('/users/me/events-subscriptions').pipe(
      map((events) => events.map((event) => this.toListItem(event))),
    );
  }

  create(payload: CreateEventPayload): Observable<EventDetails> {
    return this.api.post<ApiEvent>('/events', payload).pipe(map((event) => this.toDetails(event)));
  }

  update(id: number | string, payload: UpdateEventPayload): Observable<EventDetails> {
    return this.api.patch<ApiEvent>(`/events/${encodeURIComponent(id)}`, payload).pipe(
      map((event) => this.toDetails(event)),
    );
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
      enrollment_count: event.enrollmentCount ?? event.enrollment_count ?? null,
      format: event.format,
      category: event.category,
      start_date: event.startDate ?? event.start_date ?? null,
      end_date: event.endDate ?? event.end_date ?? null,
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
      activities: event.activities?.map((activity) => this.toActivity(activity)) ?? [],
    };
  }

  private toActivity(activity: ApiEventActivity, fallbackEventId: number | string = 0): EventActivity {
    return {
      id: activity.id,
      event_id: activity.eventId ?? activity.event_id ?? Number(fallbackEventId),
      title: activity.title,
      description: activity.description ?? null,
    };
  }

  private toEditor(editor: ApiEventEditorsPage['content'][number]): EventEditor {
    return {
      id: editor.id,
      event_id: editor.eventId ?? editor.event_id ?? 0,
      name: editor.user?.name ?? 'Editor',
      email_address: editor.user?.emailAddress ?? editor.user?.email_address ?? '',
      active: editor.active,
    };
  }
}
