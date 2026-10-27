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
});
