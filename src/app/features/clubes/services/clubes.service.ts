import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import {
  Club,
  ClubMemberFilter,
  ClubMemberPage,
  ClubMemberRole,
  ClubMemberStatus,
  ClubMembership,
  ClubPage,
  CreateClubPayload,
  UpdateClubPayload,
} from '../models/clube.model';

@Injectable({
  providedIn: 'root',
})
export class ClubesService {
  private readonly api = inject(ApiService);

  search(nextCursor?: string, pageSize = 10): Observable<ClubPage> {
    return this.api.post<ClubPage>('/clubs/search', null, {
      params: this.cursorParams('nextCursor', nextCursor, 'pageSize', pageSize),
    });
  }

  getHighlights(): Observable<Club[]> {
    return this.api.get<Club[]>('/highlights/clubs');
  }

  getMine(nextCursor?: string, pageSize = 10): Observable<ClubPage> {
    return this.api.post<ClubPage>('/clubs/me', null, {
      params: this.cursorParams('nextCursor', nextCursor, 'pageSize', pageSize),
    });
  }

  getById(clubId: number): Observable<Club> {
    return this.api.get<Club>(`/clubs/${clubId}`);
  }

  create(payload: CreateClubPayload): Observable<Club> {
    return this.api.post<Club>('/clubs', payload);
  }

  update(clubId: number, payload: UpdateClubPayload): Observable<Club> {
    return this.api.patch<Club>(`/clubs/${clubId}`, payload);
  }

  delete(clubId: number): Observable<void> {
    return this.api.delete<void>(`/clubs/${clubId}`);
  }

  enroll(clubId: number): Observable<ClubMembership> {
    return this.api.post<ClubMembership>(`/clubs/${clubId}/members/enroll`, null);
  }

  searchMembers(
    clubId: number,
    filter: ClubMemberFilter = {},
    cursor?: string,
    size = 10,
  ): Observable<ClubMemberPage> {
    return this.api.post<ClubMemberPage>(`/clubs/${clubId}/members/search`, filter, {
      params: this.cursorParams('cursor', cursor, 'size', size),
    });
  }

  addMember(clubId: number, email: string, role: ClubMemberRole): Observable<ClubMembership> {
    const params = new HttpParams().set('role', role);
    return this.api.post<ClubMembership>(
      `/clubs/${clubId}/members/staff/${encodeURIComponent(email)}`,
      null,
      { params },
    );
  }

  changeMemberStatus(memberId: number, status: ClubMemberStatus): Observable<void> {
    const params = new HttpParams().set('status', status);
    return this.api.patch<void>(`/clubs/members/${memberId}/status`, null, { params });
  }

  private cursorParams(
    cursorName: string,
    cursor: string | undefined,
    sizeName: string,
    size: number,
  ): HttpParams {
    let params = new HttpParams().set(sizeName, size.toString());
    if (cursor) {
      params = params.set(cursorName, cursor);
    }
    return params;
  }
}
