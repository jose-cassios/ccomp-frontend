import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
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

type ApiClub = Partial<Club> & { maxMembers?: number | null; coverImageUrl?: string; createdAt?: string; publishedAt?: string; updatedAt?: string };
type ApiPage<T> = { content?: T[]; next_cursor?: string | null; nextCursor?: string | null; previous_cursor?: string | null; previousCursor?: string | null };
type ApiMembership = Partial<ClubMembership> & { club?: { id: number }; clubId?: number; userId?: string; joinedAt?: string; leftAt?: string; stillLinked?: boolean };
type ApiMember = Omit<ApiMembership, 'user'> & { user?: { id?: string; name?: string; email_address?: string; emailAddress?: string | { value?: string } } };

@Injectable({
  providedIn: 'root',
})
export class ClubesService {
  private readonly api = inject(ApiService);

  search(nextCursor?: string, pageSize = 10, searchTerm?: string): Observable<ClubPage> {
    let params = this.cursorParams('nextCursor', nextCursor, 'pageSize', pageSize);
    if (searchTerm?.trim()) params = params.set('searchTerm', searchTerm.trim());
    return this.api.get<ApiPage<ApiClub>>('/clubs/search', {
      params,
    }).pipe(map(page => this.clubPage(page)));
  }

  getHighlights(): Observable<Club[]> {
    return this.api.get<ApiClub[]>('/highlights/clubs').pipe(map(rows => rows.map(row => this.club(row))));
  }

  getMine(nextCursor?: string, pageSize = 10): Observable<ClubPage> {
    return this.api.get<ApiPage<ApiClub>>('/clubs/me', {
      params: this.cursorParams('nextCursor', nextCursor, 'pageSize', pageSize),
    }).pipe(map(page => this.clubPage(page)));
  }

  getById(clubId: number): Observable<Club> {
    return this.api.get<ApiClub>(`/clubs/${clubId}`).pipe(map(row => this.club(row)));
  }

  create(payload: CreateClubPayload): Observable<Club> {
    return this.api.post<ApiClub>('/clubs', payload).pipe(map(row => this.club(row)));
  }

  update(clubId: number, payload: UpdateClubPayload): Observable<Club> {
    return this.api.patch<ApiClub>(`/clubs/${clubId}`, payload).pipe(map(row => this.club(row)));
  }

  delete(clubId: number): Observable<void> {
    return this.api.delete<void>(`/clubs/${clubId}`);
  }

  enroll(clubId: number): Observable<ClubMembership> {
    return this.api.post<ApiMembership>(`/clubs/${clubId}/members/enroll`, null).pipe(map(row => this.membership(row, clubId)));
  }

  unenroll(clubId: number): Observable<void> {
    return this.api.delete<void>(`/clubs/${clubId}/members/unenroll`);
  }

  searchMembers(
    clubId: number,
    filter: ClubMemberFilter = {},
    cursor?: string,
    size = 10,
    searchTerm?: string,
  ): Observable<ClubMemberPage> {
    let params = this.cursorParams('cursor', cursor, 'size', size);
    if (searchTerm?.trim()) params = params.set('searchTerm', searchTerm.trim());
    return this.api.post<ApiPage<ApiMember>>(`/clubs/${clubId}/members/search`, filter, {
      params,
    }).pipe(map(page => ({
      ...this.cursors(page), content: (page.content ?? []).map(row => ({
        ...this.membership(row, clubId), user: { id: row.user?.id ?? '', name: row.user?.name ?? 'Participante',
          email_address: row.user?.email_address ?? (typeof row.user?.emailAddress === 'string' ? row.user.emailAddress : row.user?.emailAddress?.value ?? '') },
      })),
    })));
  }

  addMember(clubId: number, email: string, role: ClubMemberRole): Observable<ClubMembership> {
    const params = new HttpParams().set('role', role);
    return this.api.post<ApiMembership>(
      `/clubs/${clubId}/members/staff/${encodeURIComponent(email.trim().toLowerCase())}`,
      null,
      { params },
    ).pipe(map(row => this.membership(row, clubId)));
  }

  changeMemberStatus(clubId: number, memberId: number, status: ClubMemberStatus): Observable<void> {
    const params = new HttpParams().set('status', status);
    return this.api.patch<void>(`/clubs/${clubId}/members/${memberId}/status`, null, { params });
  }

  private club(row: ApiClub): Club {
    return { id: row.id!, name: row.name ?? '', status: row.status ?? 'DRAFT', max_members: row.max_members ?? row.maxMembers ?? null, summary: row.summary ?? null, content: row.content ?? null,
      cover_image_url: row.cover_image_url ?? row.coverImageUrl ?? null,
      published_at: row.published_at ?? row.publishedAt ?? null,
      created_at: row.created_at ?? row.createdAt ?? '', updated_at: row.updated_at ?? row.updatedAt ?? '' };
  }
  private cursors<T>(page: ApiPage<T>) {
    return { next_cursor: page.next_cursor ?? page.nextCursor ?? null, previous_cursor: page.previous_cursor ?? page.previousCursor ?? null };
  }
  private clubPage(page: ApiPage<ApiClub>): ClubPage { return { ...this.cursors(page), content: (page.content ?? []).map(row => this.club(row)) }; }
  private membership(row: ApiMembership, clubId: number): ClubMembership {
    return { id: row.id!, club_id: row.club_id ?? row.clubId ?? row.club?.id ?? clubId,
      user_id: row.user_id ?? row.userId ?? '', role: row.role ?? 'MEMBER', status: row.status ?? 'ACTIVE',
      joined_at: row.joined_at ?? row.joinedAt ?? '', left_at: row.left_at ?? row.leftAt ?? null,
      still_linked: row.still_linked ?? row.stillLinked ?? !['CANCELLED', 'BANNED'].includes(row.status ?? 'ACTIVE') };
  }

  private cursorParams(
    cursorName: string,
    cursor: string | undefined,
    sizeName: string,
    size: number,
  ): HttpParams {
    let params = new HttpParams().set(sizeName, String(Math.min(50, Math.max(1, Math.floor(size) || 10))));
    if (cursor) {
      params = params.set(cursorName, cursor);
    }
    return params;
  }
}
