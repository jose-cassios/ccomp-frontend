import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, from, map, switchMap, throwError } from 'rxjs';
import { ApiConfig } from '../../../core/api/api.config';

export interface EventMaterial {
  id: number;
  title: string;
  description?: string | null;
  type: 'LINK' | 'FILE';
  url?: string | null;
  original_file_name?: string | null;
  content_type?: string | null;
  size_bytes?: number | null;
}
export interface MaterialLink { title: string; description: string; url: string; }
export function safeMaterialUrl(value?: string | null): string | null {
  try { const url = new URL(value ?? ''); return ['http:', 'https:'].includes(url.protocol) ? url.href : null; } catch { return null; }
}

@Injectable({ providedIn: 'root' })
export class EventMaterialsService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ApiConfig);
  private base(eventId: number, activityId?: number) {
    return this.config.buildUrl(activityId ? `/events/activities/${activityId}/materials` : `/events/${eventId}/materials`);
  }
  list(eventId: number, activityId?: number, cursor?: string) {
    let params = new HttpParams().set('pageSize', 10);
    if (cursor) params = params.set('nextCursor', cursor);
    return this.http.get<{ content: (EventMaterial & { originalFileName?: string; contentType?: string; sizeBytes?: number })[]; next_cursor?: string | null; nextCursor?: string | null }>(this.base(eventId, activityId), { params }).pipe(map(page => ({
      content: page.content.map(row => ({ ...row, original_file_name: row.original_file_name ?? row.originalFileName,
        content_type: row.content_type ?? row.contentType, size_bytes: row.size_bytes ?? row.sizeBytes })),
      next_cursor: page.next_cursor ?? page.nextCursor ?? null,
    })));
  }
  addLink(eventId: number, value: MaterialLink, activityId?: number) {
    return this.http.post<EventMaterial>(`${this.base(eventId, activityId)}/links`, value);
  }
  upload(eventId: number, value: { title: string; description: string }, file: File, activityId?: number) {
    const body = new FormData(); body.append('title', value.title); body.append('description', value.description); body.append('file', file);
    return this.http.post<EventMaterial>(`${this.base(eventId, activityId)}/files`, body);
  }
  remove(eventId: number, materialId: number, activityId?: number) {
    return this.http.delete<void>(`${this.base(eventId, activityId)}/${materialId}`);
  }
  download(eventId: number, materialId: number, activityId?: number) {
    return this.http.get(`${this.base(eventId, activityId)}/${materialId}/file`, { responseType: 'blob' }).pipe(catchError(error => {
      if (!(error instanceof HttpErrorResponse) || !(error.error instanceof Blob)) return throwError(() => error);
      return from(error.error.text()).pipe(switchMap(text => {
        let body: unknown; try { body = JSON.parse(text); } catch { body = null; }
        return throwError(() => new HttpErrorResponse({ error: body, status: error.status, statusText: error.statusText }));
      }));
    }));
  }
}
