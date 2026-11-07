import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { map } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { ApiConfig } from '../../../core/api/api.config';
import { ApiMessage } from '../models/event.model';

export interface EventGuest {
  id: number;
  user_id: string;
  status: 'CONFIRMED' | 'CANCELED';
  visibility: 'PUBLIC' | 'PRIVATE';
  name?: string;
  image_url?: string;
  email?: string;
  description?: string;
  event_guest_id?: number;
  role?: GuestRole;
}
export type GuestRole = 'PRESENTER' | 'SPECIAL_GUEST' | 'MODERATOR' | 'LISTENER';
export interface GuestProfile { name: string; description: string; }
export interface GuestInvitation {
  id: number;
  code: string;
  email: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';
  expires_at: string | null;
}
interface WireGuest extends Omit<EventGuest, 'user_id'> {
  user_id?: string; userId?: string; imageUrl?: string; email_address?: string; emailAddress?: string;
  image_key?: string; imageKey?: string; eventGuestId?: number;
}
interface WireInvitation extends Omit<GuestInvitation, 'email' | 'expires_at'> {
  email_address?: string | { value: string };
  emailAddress?: string | { value: string };
  expires_at?: string; expiresAt?: string;
}
interface Page<T> { content: T[]; next_cursor?: string | null; nextCursor?: string | null }

@Injectable({ providedIn: 'root' })
export class EventGuestsService {
  private readonly api = inject(ApiService);
  private readonly config = inject(ApiConfig);
  create(eventId: number, profile: GuestProfile) {
    return this.api.post<ApiMessage>(`/events/${eventId}/guests`, profile);
  }
  profile(eventId: number, guestId: number, profile: GuestProfile) {
    return this.api.patch<ApiMessage>(`/events/${eventId}/guests/${guestId}/profile`, profile);
  }
  associate(eventId: number, guestId: number, activityId: number, role: GuestRole) {
    return this.api.post<void>(`/events/${eventId}/guests/${guestId}/activities/${activityId}`, { role });
  }
  uploadImage(eventId: number, guestId: number, file: File) {
    const body = new FormData(); body.append('file', file);
    return this.api.post<ApiMessage>(`/events/${eventId}/guests/${guestId}/image`, body);
  }
  removeImage(eventId: number, guestId: number) {
    return this.api.delete<void>(`/events/${eventId}/guests/${guestId}/image`);
  }
  guests(eventId: number, cursor?: string, activityId?: number) {
    const path = activityId ? `/events/activities/${activityId}/guests` : `/events/${eventId}/guests`;
    return this.api.get<Page<WireGuest | { eventGuest?: WireGuest; event_guest?: WireGuest }>>(path, {
      params: this.params(cursor),
    }).pipe(map((page) => ({
      content: page.content.map((row) => {
        const guest = ('eventGuest' in row ? row.eventGuest : undefined)
          ?? ('event_guest' in row ? row.event_guest : undefined) ?? row as WireGuest;
        return { ...guest, user_id: guest.user_id ?? guest.userId ?? '',
          event_guest_id: guest.event_guest_id ?? guest.eventGuestId,
          image_url: (guest.image_key ?? guest.imageKey)
            ? this.config.buildUrl(`/events/${eventId}/guests/${guest.event_guest_id ?? guest.eventGuestId ?? guest.id}/image`)
            : guest.image_url ?? guest.imageUrl,
          email: guest.email ?? guest.email_address ?? guest.emailAddress,
        } as EventGuest;
      }),
      next_cursor: page.next_cursor ?? page.nextCursor ?? null,
    })));
  }
  invitations(eventId: number, email = '', cursor?: string) {
    let params = this.params(cursor);
    if (email.trim()) params = params.set('email', email.trim());
    return this.api.get<Page<WireInvitation>>(`/events/${eventId}/invitations`, { params }).pipe(map((page) => ({
      content: page.content.map((item): GuestInvitation => {
        const email = item.email_address ?? item.emailAddress;
        return { ...item, email: typeof email === 'string' ? email : email?.value ?? '',
          expires_at: item.expires_at ?? item.expiresAt ?? null };
      }),
      next_cursor: page.next_cursor ?? page.nextCursor ?? null,
    })));
  }
  invite(eventId: number, email: string) {
    return this.api.post<ApiMessage>(`/events/${eventId}/invitations`, { email: email.trim() });
  }
  cancel(id: number) { return this.api.delete<ApiMessage>(`/events/invitations/${id}`); }
  reply(code: string, accept: boolean) {
    return this.api.post<ApiMessage>(`/events/invitations/${encodeURIComponent(code)}/reply`, null, {
      params: new HttpParams().set('accept', accept),
    });
  }
  update(eventId: number, guestId: number, update: Partial<Pick<EventGuest, 'status' | 'visibility'>>) {
    return this.api.patch<ApiMessage>(`/events/${eventId}/guests/${guestId}`, update);
  }
  private params(cursor?: string) {
    let params = new HttpParams().set('pageSize', '20');
    if (cursor) params = params.set('cursor', cursor);
    return params;
  }
}
