import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { EMPTY, expand, map, reduce } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { ApiMessage } from '../models/event.model';

export interface InstructorInvitation {
  id: number;
  email: string;
  status: string;
}
interface WireInvitation { id: number; emailAddress?: string; email_address?: string; status: string; }
interface Instructor {
  id: number; activityId?: number; activity_id?: number; status: string; name?: string; image_url?: string;
}
interface InstructorPage { content: Instructor[]; nextCursor?: string | null; next_cursor?: string | null; }
@Injectable({ providedIn: 'root' })
export class ActivityInstructorsService {
  private readonly api = inject(ApiService);
  private page(eventId: number, cursor?: string) {
    let params = new HttpParams().set('pageSize', 50);
    if (cursor) params = params.set('cursor', cursor);
    return this.api.get<InstructorPage>(`/events/${eventId}/instructors`, { params });
  }
  forActivity(eventId: number, activityId: number) {
    return this.page(eventId).pipe(
      expand(page => { const cursor = page.next_cursor ?? page.nextCursor; return cursor ? this.page(eventId, cursor) : EMPTY; }),
      reduce((rows, page) => [...rows, ...page.content], [] as Instructor[]),
      map(rows => rows.filter(row => (row.activity_id ?? row.activityId) === activityId && row.status === 'CONFIRMED')),
    );
  }
  invitations(activityId: number) {
    return this.api.get<WireInvitation[]>(`/events/activities/${activityId}/instructors/invitations`).pipe(
      map(rows => rows.map(row => ({ id: row.id, email: row.email_address ?? row.emailAddress ?? '', status: row.status }))),
    );
  }
  invite(activityId: number, email: string) {
    return this.api.post<ApiMessage>(`/events/activities/${activityId}/instructors/invitations`, { email: email.trim() });
  }
  cancel(invitationId: number) {
    return this.api.delete<ApiMessage>(`/events/instructor-invitations/${invitationId}`);
  }
  reply(code: string, accept: boolean) {
    return this.api.post<ApiMessage>(`/events/instructor-invitations/${encodeURIComponent(code)}/reply`, null,
      { params: new HttpParams().set('accept', accept) });
  }
}
