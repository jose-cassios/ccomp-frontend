import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { CertificatesService } from './certificates.service';
import { CertificateBox } from '../models/certificate.model';

describe('CertificatesService API contract', () => {
  let service: CertificatesService;
  let http: HttpTestingController;
  const box: CertificateBox = { text_template: '{participante.nome}', x: .1, y: .2, width: .8,
    font_size: 25, font_color: '#123456', alignment: 'CENTERED' };
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(CertificatesService); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  for (const scope of ['event', 'activity'] as const) {
    const prefix = scope === 'activity' ? 'activity-' : '';
    it(`loads and saves the ${scope} template using snake_case fields`, () => {
      service.template(9, scope).subscribe(result => expect(result.boxes[0]).toEqual(box));
      http.expectOne(r => r.url.endsWith(`/events/9/${prefix}certificate-box-template`)).flush({ boxes: [box], variables: ['{participante.nome}'] });
      service.saveTemplate(9, scope, [box]).subscribe();
      const request = http.expectOne(r => r.url.endsWith(`/events/9/${prefix}certificate-box-template`));
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({ boxes: [box] }); request.flush({ message: 'OK' });
    });
    it(`retrieves the saved ${scope} preview as a binary image`, () => {
      service.preview(9, scope).subscribe();
      const request = http.expectOne(r => r.url.endsWith(`/events/9/${prefix}certificate-preview`));
      expect(request.request.responseType).toBe('blob'); request.flush(new Blob(['png']));
    });
    it(`downloads the authenticated ${scope} certificate`, () => {
      service.download(9, scope).subscribe();
      const path = scope === 'activity' ? '/events/activities/9/certificate' : '/events/9/certificate';
      const request = http.expectOne(r => r.url.endsWith(path));
      expect(request.request.method).toBe('GET'); expect(request.request.responseType).toBe('blob');
      request.flush(new Blob(['png']));
    });
  }
  it('reads, uploads multipart file and removes the shared cover', () => {
    service.cover(9).subscribe();
    const get = http.expectOne(r => r.url.endsWith('/events/9/certificate-cover-template'));
    expect(get.request.responseType).toBe('blob'); get.flush(new Blob(['png']));
    const file = new File(['image'], 'cover.png', { type: 'image/png' });
    service.uploadCover(9, file).subscribe();
    const upload = http.expectOne(r => r.url.endsWith('/events/9/certificate-cover-template'));
    expect(upload.request.method).toBe('POST');
    expect(upload.request.body.get('file')).toEqual(file);
    expect(upload.request.headers.has('Content-Type')).toBe(false); upload.flush({ message: 'OK' });
    service.deleteCover(9).subscribe();
    const remove = http.expectOne(r => r.url.endsWith('/events/9/certificate-cover-template'));
    expect(remove.request.method).toBe('DELETE'); remove.flush(null, { status: 204, statusText: 'No Content' });
  });
  it('loads the available variables and validates a normalized, escaped code', () => {
    service.variables().subscribe();
    http.expectOne(r => r.url.endsWith('/events/certificate-variables')).flush(['{participante.nome}']);
    service.validate(' abc/123 ').subscribe();
    http.expectOne(r => r.url.endsWith('/events/certificates/validate/ABC%2F123')).flush({ code: 'ABC/123' });
  });
  it('decodes JSON blob errors so check-in failures are explained', async () => {
    const promise = firstValueFrom(service.download(9, 'activity')).catch(error => error as HttpErrorResponse);
    const blob = new Blob([JSON.stringify({ message: 'O inscrito não fez o check-in nesta atividade.' })], { type: 'application/json' });
    // jsdom versions without Blob.text still exercise the asynchronous decoder.
    if (!blob.text) Object.defineProperty(blob, 'text', { value: async () => JSON.stringify({ message: 'O inscrito não fez o check-in nesta atividade.' }) });
    http.expectOne(r => r.url.endsWith('/events/activities/9/certificate')).flush(blob, { status: 400, statusText: 'Bad Request' });
    const error = await promise as HttpErrorResponse;
    expect(error.status).toBe(400);
    expect(error.error.message).toContain('check-in');
  });

  for (const [scope, type] of [['instructor', 'INSTRUCTOR'], ['team', 'EDITOR'], ['guest', 'GUEST']] as const) {
    it('uses the ' + type + ' context for templates, variables and preview', () => {
      service.template(9, scope).subscribe();
      const template = http.expectOne(r => r.url.endsWith('/events/9/certificate-box-template'));
      expect(template.request.params.get('type')).toBe(type); template.flush({ boxes: [], variables: [] });
      service.saveTemplate(9, scope, [box]).subscribe();
      const save = http.expectOne(r => r.method === 'POST');
      expect(save.request.params.get('type')).toBe(type); expect(save.request.body).toEqual({ boxes: [box] }); save.flush({});
      service.variables(scope).subscribe();
      const vars = http.expectOne(r => r.url.endsWith('/certificate-variables'));
      expect(vars.request.params.get('type')).toBe(type); vars.flush([]);
      service.preview(9, scope).subscribe();
      const preview = http.expectOne(r => r.url.endsWith('/certificate-preview'));
      expect(preview.request.params.get('type')).toBe(type); preview.flush(new Blob());
    });
  }
  it('downloads instructor certificates by the instructor record ID and team certificates by event ID', () => {
    service.download(9, 'instructor', 42).subscribe();
    const instructor = http.expectOne(r => r.url.endsWith('/events/9/instructors/42/certificate'));
    expect(instructor.request.responseType).toBe('blob'); instructor.flush(new Blob());
    service.download(9, 'team').subscribe();
    http.expectOne(r => r.url.endsWith('/events/9/team-certificate')).flush(new Blob());
    for (const id of [undefined, 0, -1, 1.5]) {
      const error = vi.fn(); service.download(9, 'instructor', id).subscribe({ error });
      expect(error).toHaveBeenCalled();
    }
    http.expectNone(() => true);
  });

  for (const [scope, type, variableType] of [['activity', 'PARTICIPANT', 'ACTIVITY'], ['activity-instructor', 'INSTRUCTOR', 'ACTIVITY_INSTRUCTOR'], ['activity-guest', 'GUEST', 'ACTIVITY_GUEST']] as const) {
    it('isolates the specific activity template, cover and preview for ' + type, () => {
      service.template(9, scope, 5).subscribe();
      const template = http.expectOne(r => r.url.endsWith('/events/9/activities/5/certificate-box-template'));
      expect(template.request.params.get('type')).toBe(type); template.flush({ boxes: [box], variables: [] });
      service.saveTemplate(9, scope, [box], 5).subscribe();
      const save = http.expectOne(r => r.method === 'POST');
      expect(save.request.url).toContain('/activities/5/certificate-box-template');
      expect(save.request.params.get('type')).toBe(type); expect(save.request.body).toEqual({ boxes: [box] }); save.flush({});
      service.cover(9, scope, 5).subscribe();
      const cover = http.expectOne(r => r.url.endsWith('/activities/5/certificate-cover-template'));
      expect(cover.request.params.get('type')).toBe(type); cover.flush(new Blob());
      service.uploadCover(9, new File(['png'], 'cover.png'), scope, 5).subscribe();
      const upload = http.expectOne(r => r.method === 'POST');
      expect(upload.request.url).toContain('/activities/5/certificate-cover-template');
      expect(upload.request.body.get('file').name).toBe('cover.png'); expect(upload.request.params.get('type')).toBe(type); upload.flush({});
      service.deleteCover(9, scope, 5).subscribe();
      http.expectOne(r => r.method === 'DELETE' && r.url.endsWith('/activities/5/certificate-cover-template') && r.params.get('type') === type).flush(null);
      service.preview(9, scope, 5).subscribe();
      const preview = http.expectOne(r => r.url.endsWith('/events/9/activity-certificate-preview'));
      expect(preview.request.params.get('activityId')).toBe('5'); expect(preview.request.params.get('type')).toBe(type); preview.flush(new Blob());
      service.variables(scope).subscribe();
      http.expectOne(r => r.params.get('type') === variableType).flush([]);
      service.deleteActivityTemplate(9, scope, 5).subscribe();
      http.expectOne(r => r.method === 'DELETE' && r.url.endsWith('/activities/5/certificate-box-template') && r.params.get('type') === type).flush(null);
    });
  }
  it('issues manual certificates using recipient IDs and snake_case bodies', () => {
    service.manualInstructor(9, { instructor_id: 4, activity_id: 5 }).subscribe();
    const instructor = http.expectOne(r => r.url.endsWith('/events/9/instructor-certificate/manual'));
    expect(instructor.request.method).toBe('POST'); expect(instructor.request.responseType).toBe('blob');
    expect(instructor.request.body).toEqual({ instructor_id: 4, activity_id: 5 }); instructor.flush(new Blob());
    service.manualInstructor(9, { activity_id: 5, activity_guest_id: 8 }).subscribe();
    const guest = http.expectOne(r => r.url.endsWith('/instructor-certificate/manual'));
    expect(guest.request.body).toEqual({ activity_id: 5, activity_guest_id: 8 }); guest.flush(new Blob());
    service.manualTeam(9, 'recipient-id').subscribe();
    const team = http.expectOne(r => r.url.endsWith('/events/9/team-certificate/manual/recipient-id'));
    expect(team.request.method).toBe('POST'); expect(team.request.body).toBeNull(); team.flush(new Blob());
    for (const preview of [true, false]) {
      service.manualContent(9, { boxes: [box], variables: { '{participante.nome}': 'Ana' } }, preview).subscribe();
      const request = http.expectOne(r => r.url.endsWith('/certificate/manual' + (preview ? '/preview' : '')));
      expect(request.request.method).toBe('POST'); expect(request.request.body.variables).toEqual({ '{participante.nome}': 'Ana' }); request.flush(new Blob());
    }
  });
  it('requests validated role certificates using activity link IDs', () => {
    service.guestCertificate(9, 5, 8).subscribe();
    http.expectOne(r => r.url.endsWith('/events/9/activities/5/guests/8/instructor-certificate')).flush(new Blob());
    service.guestCertificate(9, 5, 8, true).subscribe();
    http.expectOne(r => r.url.endsWith('/events/9/activities/5/guests/8/activity-certificate')).flush(new Blob());
    service.instructorActivityCertificate(9, 5, 4).subscribe();
    http.expectOne(r => r.url.endsWith('/events/9/activities/5/instructors/4/activity-certificate')).flush(new Blob());
  });
});
