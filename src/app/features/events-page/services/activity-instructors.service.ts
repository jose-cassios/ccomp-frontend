import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { map } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { ApiMessage } from '../models/event.model';

export interface InstructorInvitation {
  id: number;
  email: string;
  status: string;
  expires_at?: string;
}
interface WireInvitation { id: number; emailAddress?: string; email_address?: string; status: string; expires_at?: string; expiresAt?: string; }
export interface Instructor {
  id: number; activity_id: number; user_id?: string | null; status: string; name?: string; description?: string;
  role?: 'INSTRUCTOR' | 'ASSISTANT'; is_guest: boolean;
}
interface WireInstructor extends Partial<Instructor> { id: number; activityId?: number; userId?: string | null; isGuest?: boolean; }
export interface InstructorProfile { name: string; description?: string; role: 'INSTRUCTOR' | 'ASSISTANT'; account_email?: string; }
@Injectable({ providedIn: 'root' })
export class ActivityInstructorsService {
  private readonly api = inject(ApiService);
  forActivity(_eventId: number, activityId: number) {
    return this.api.get<WireInstructor[]>(`/events/activities/${activityId}/instructors`).pipe(
      map(rows => rows.map(row => ({
        ...row,
        activity_id: row.activity_id ?? row.activityId ?? activityId,
        user_id: row.user_id ?? row.userId,
        is_guest: row.is_guest ?? row.isGuest ?? false,
        status: row.status ?? 'CONFIRMED',
      } as Instructor)).filter(row => !row.is_guest)),
    );
  }
  add(activityId: number, profile: InstructorProfile) { return this.api.post<ApiMessage>(`/events/activities/${activityId}/instructors`, profile); }
  linkAccount(activityId: number, instructorId: number, email: string) { return this.api.patch<ApiMessage>(`/events/activities/${activityId}/instructors/${instructorId}/account`, { email: email.trim() }); }
  remove(activityId: number, instructorId: number) { return this.api.delete<void>(`/events/activities/${activityId}/instructors/${instructorId}`); }
  cancelMine(activityId: number) { return this.api.delete<ApiMessage>(`/events/activities/${activityId}/instructors/me`); }
  invitations(activityId: number) {
    return this.api.get<WireInvitation[]>(`/events/activities/${activityId}/instructors/invitations`).pipe(
      map(rows => rows.map(row => ({ id: row.id, email: row.email_address ?? row.emailAddress ?? '', status: row.status, expires_at: row.expires_at ?? row.expiresAt }))),
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
