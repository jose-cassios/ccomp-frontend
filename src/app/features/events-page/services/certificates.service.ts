import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, catchError, from, switchMap, throwError } from 'rxjs';
import { ApiConfig } from '../../../core/api/api.config';
import { CertificateBox, CertificateScope, CertificateTemplateScope, ManualCertificateContent, ManualInstructorCertificate, CertificateTemplate, CertificateValidation } from '../models/certificate.model';

@Injectable({ providedIn: 'root' })
export class CertificatesService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ApiConfig);

  template(eventId: number, scope: CertificateTemplateScope, activityId?: number) {
    return this.http.get<CertificateTemplate>(this.url(eventId, scope, 'box-template', activityId), { params: this.params(scope) });
  }

  saveTemplate(eventId: number, scope: CertificateTemplateScope, boxes: CertificateBox[], activityId?: number) {
    return this.http.post(this.url(eventId, scope, 'box-template', activityId), { boxes }, { params: this.params(scope) });
  }

  variables(scope: CertificateTemplateScope = 'event') {
    return this.http.get<string[]>(this.config.buildUrl('/events/certificate-variables'), { params: new HttpParams().set('type', this.variableType(scope)) });
  }

  cover(eventId: number, scope: CertificateTemplateScope = 'event', activityId?: number) {
    return this.image(this.url(eventId, activityId ? scope : 'event', 'cover-template', activityId), this.params(scope));
  }

  uploadCover(eventId: number, file: File, scope: CertificateTemplateScope = 'event', activityId?: number) {
    const body = new FormData();
    body.append('file', file);
    return this.http.post(this.url(eventId, activityId ? scope : 'event', 'cover-template', activityId), body, { params: this.params(scope) });
  }

  deleteCover(eventId: number, scope: CertificateTemplateScope = 'event', activityId?: number) {
    return this.http.delete<void>(this.url(eventId, activityId ? scope : 'event', 'cover-template', activityId), { params: this.params(scope) });
  }

  preview(eventId: number, scope: CertificateTemplateScope, activityId?: number) {
    return this.image(this.url(eventId, scope, 'preview'), activityId ? this.params(scope).set('activityId', activityId) : this.params(scope));
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

  deleteActivityTemplate(eventId: number, scope: CertificateTemplateScope, activityId: number) {
    return this.http.delete<void>(this.url(eventId, scope, 'box-template', activityId), { params: this.params(scope) });
  }

  manualInstructor(eventId: number, target: ManualInstructorCertificate) {
    return this.binary(this.http.post(this.config.buildUrl(`/events/${eventId}/instructor-certificate/manual`), target, { responseType: 'blob' }));
  }
  manualTeam(eventId: number, userId: string) {
    return this.binary(this.http.post(this.config.buildUrl(`/events/${eventId}/team-certificate/manual/${encodeURIComponent(userId)}`), null, { responseType: 'blob' }));
  }
  manualContent(eventId: number, content: ManualCertificateContent, preview = false) {
    return this.binary(this.http.post(this.config.buildUrl(`/events/${eventId}/certificate/manual${preview ? '/preview' : ''}`), content, { responseType: 'blob' }));
  }
  guestCertificate(eventId: number, activityId: number, guestId: number, activity = false) {
    return this.image(this.config.buildUrl(`/events/${eventId}/activities/${activityId}/guests/${guestId}/${activity ? 'activity-certificate' : 'instructor-certificate'}`));
  }
  instructorActivityCertificate(eventId: number, activityId: number, instructorId: number) {
    return this.image(this.config.buildUrl(`/events/${eventId}/activities/${activityId}/instructors/${instructorId}/activity-certificate`));
  }
  private url(eventId: number, scope: CertificateTemplateScope, suffix: string, activityId?: number) {
    const activity = scope.startsWith('activity');
    return this.config.buildUrl(activity && activityId
      ? `/events/${eventId}/activities/${activityId}/certificate-${suffix}`
      : `/events/${eventId}/${activity ? 'activity-' : ''}certificate-${suffix}`);
  }
  private type(scope: CertificateTemplateScope) {
    return { event: 'PARTICIPANT', activity: 'PARTICIPANT', instructor: 'INSTRUCTOR', guest: 'GUEST', team: 'EDITOR', 'activity-instructor': 'INSTRUCTOR', 'activity-guest': 'GUEST' }[scope];
  }
  private variableType(scope: CertificateTemplateScope) {
    return scope === 'activity' ? 'ACTIVITY' : scope === 'activity-instructor' ? 'ACTIVITY_INSTRUCTOR' : scope === 'activity-guest' ? 'ACTIVITY_GUEST' : this.type(scope);
  }
  private params(scope: CertificateTemplateScope) { return new HttpParams().set('type', this.type(scope)); }

  private image(url: string, params = new HttpParams()) {
    return this.binary(this.http.get(url, { responseType: 'blob', params }));
  }

  private binary(request: Observable<Blob>) {
    // HttpClient returns error JSON as a Blob when responseType is blob.
    // Decode it so enrollment/check-in errors remain readable to participants.
    return request.pipe(catchError((error: unknown) => {
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
