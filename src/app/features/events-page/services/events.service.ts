import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import {
  ActivityPayload,
  ApiMessage,
  CreateEventPayload,
  EventActivity,
  EventDetails,
  EventListItem,
  EventResponse,
  EventsFilter,
  EventsPageResponse,
  UpdateEventPayload,
} from '../models/event.model';

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

    return this.api.post<EventsPageResponse>('/events/search', filter, { params });
  }

  getById(id: number | string): Observable<EventDetails> {
    return this.api.get<EventDetails>(`/events/${encodeURIComponent(id)}`);
  }

  getBySlug(slug: string): Observable<EventDetails> {
    return this.api.get<EventDetails>(`/events/slug/${encodeURIComponent(slug)}`);
  }

  getCreatedEvents(): Observable<EventResponse[]> {
    return this.api.get<EventResponse[]>('/users/me/created-events');
  }

  getSubscriptions(): Observable<EventResponse[]> {
    return this.api.get<EventResponse[]>('/users/me/events-subscriptions');
  }

  create(payload: CreateEventPayload): Observable<EventResponse> {
    return this.api.post<EventResponse>('/events', payload);
  }

  update(payload: UpdateEventPayload): Observable<EventListItem> {
    return this.api.patch<EventListItem>('/events', payload);
  }

  deleteEvent(id: number | string): Observable<ApiMessage> {
    return this.api.delete<ApiMessage>(`/events/${encodeURIComponent(id)}`);
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

  createActivity(eventId: number | string, payload: ActivityPayload): Observable<EventActivity> {
    return this.api.post<EventActivity>(
      `/events/${encodeURIComponent(eventId)}/activities`,
      payload,
    );
  }

  deleteActivity(activityId: number | string): Observable<ApiMessage> {
    return this.api.delete<ApiMessage>(
      `/events/activities/${encodeURIComponent(activityId)}`,
    );
  }
}
