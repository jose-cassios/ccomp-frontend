import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { ApiConfig } from '../../../core/api/api.config';
import { CertificateBox, CertificateScope, CertificateTemplate, CertificateValidation } from '../models/certificate.model';

@Injectable({ providedIn: 'root' })
export class CertificatesService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ApiConfig);

  template(eventId: number, scope: CertificateScope) {
    return this.http.get<CertificateTemplate>(this.url(eventId, scope, 'box-template'), { params: this.params(scope) });
  }

  saveTemplate(eventId: number, scope: CertificateScope, boxes: CertificateBox[]) {
    return this.http.post(this.url(eventId, scope, 'box-template'), { boxes }, { params: this.params(scope) });
  }

  variables(scope: CertificateScope = 'event') {
    return this.http.get<string[]>(this.config.buildUrl('/events/certificate-variables'), { params: new HttpParams().set('type', this.type(scope)) });
  }

  cover(eventId: number) {
    return this.image(this.url(eventId, 'event', 'cover-template'));
  }

  uploadCover(eventId: number, file: File) {
    const body = new FormData();
    body.append('file', file);
    return this.http.post(this.url(eventId, 'event', 'cover-template'), body);
  }

  deleteCover(eventId: number) {
    return this.http.delete<void>(this.url(eventId, 'event', 'cover-template'));
  }

  preview(eventId: number, scope: CertificateScope) {
    return this.image(this.url(eventId, scope, 'preview'), this.params(scope));
  }

  download(id: number, scope: CertificateScope, instructorId?: number) {
    if (scope === 'instructor') {
      if (!instructorId || instructorId <= 0 || !Number.isSafeInteger(instructorId)) return throwError(() => new Error('Selecione um ministrante confirmado.'));
      return this.image(this.config.buildUrl(`/events/${id}/instructors/${instructorId}/certificate`));
    }
    if (scope === 'team') return this.image(this.config.buildUrl(`/events/${id}/team-certificate`));
    return this.image(this.config.buildUrl(scope === 'event'
      ? `/events/${id}/certificate` : `/events/activities/${id}/certificate`));
  }

  validate(code: string) {
    return this.http.get<CertificateValidation>(this.config.buildUrl(
      `/events/certificates/validate/${encodeURIComponent(code.trim().toUpperCase())}`));
  }

  private url(eventId: number, scope: CertificateScope, suffix: string) {
    return this.config.buildUrl(`/events/${eventId}/${scope === 'activity' ? 'activity-' : ''}certificate-${suffix}`);
  }

  private type(scope: CertificateScope) { return { event: 'PARTICIPANT', activity: 'ACTIVITY', instructor: 'INSTRUCTOR', team: 'EDITOR' }[scope]; }
  private params(scope: CertificateScope) { return scope === 'activity' ? new HttpParams() : new HttpParams().set('type', this.type(scope)); }

  private image(url: string, params = new HttpParams()) {
    // HttpClient returns error JSON as a Blob when responseType is blob.
    // Decode it so enrollment/check-in errors remain readable to participants.
    return this.http.get(url, { responseType: 'blob', params }).pipe(catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || !(error.error instanceof Blob)) {
        return throwError(() => error);
      }
      return from(error.error.text()).pipe(switchMap(text => {
        let body: unknown;
        try { body = JSON.parse(text); } catch { body = null; }
        return throwError(() => new HttpErrorResponse({
          error: body, status: error.status, statusText: error.statusText,
          headers: error.headers, url: error.url ?? undefined,
        }));
      }));
    }));
  }
}
