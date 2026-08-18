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

  getFeatured(): Observable<EventListItem> {
    return this.api.get<EventListItem>('/events/featured');
  }

  getById(id: number | string): Observable<EventDetails> {
    return this.api.get<EventDetails>(`/events/${encodeURIComponent(id)}`);
  }

  getEditableEvents(): Observable<EventListItem[]> {
    return this.api.get<EventListItem[]>('/users/me/editable-events');
  }

  getSubscriptions(): Observable<EventDetails[]> {
    return this.api.get<EventDetails[]>('/users/me/events-subscriptions');
  }

  create(payload: CreateEventPayload): Observable<EventDetails> {
    return this.api.post<EventDetails>('/events', payload);
  }

  update(payload: UpdateEventPayload): Observable<EventDetails> {
    return this.api.patch<EventDetails>('/events', payload);
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

  getEditors(eventId: number | string): Observable<string[]> {
    return this.api.get<string[]>(`/events/${encodeURIComponent(eventId)}/editors`);
  }

  addEditor(eventId: number | string, userId: string): Observable<ApiMessage> {
    return this.api.post<ApiMessage>(
      `/events/${encodeURIComponent(eventId)}/editors/${encodeURIComponent(userId)}`,
      null,
    );
  }

  removeEditor(eventId: number | string, userId: string): Observable<ApiMessage> {
    return this.api.delete<ApiMessage>(
      `/events/${encodeURIComponent(eventId)}/editors/${encodeURIComponent(userId)}`,
    );
  }

  createActivity(eventId: number | string, payload: ActivityPayload): Observable<EventActivity> {
    return this.api.post<EventActivity>(
      `/events/${encodeURIComponent(eventId)}/activities`,
      payload,
    );
  }

  updateActivity(activityId: number | string, payload: ActivityPayload): Observable<EventActivity> {
    return this.api.patch<EventActivity>(
      `/events/activities/${encodeURIComponent(activityId)}`,
      payload,
    );
  }

  deleteActivity(activityId: number | string): Observable<ApiMessage> {
    return this.api.delete<ApiMessage>(`/events/activities/${encodeURIComponent(activityId)}`);
  }
}
