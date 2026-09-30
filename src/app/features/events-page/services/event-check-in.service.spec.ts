import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EventCheckInService } from './event-check-in.service';

describe('EventCheckInService contract', () => {
  let service: EventCheckInService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(EventCheckInService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('requests the protected PNG through HttpClient using the singular activity route', () => {
    const png = new Blob(['png'], { type: 'image/png' });
    service.getQrCode(7).subscribe(value => expect(value).toBe(png));
    const request = http.expectOne(r => r.url.endsWith('/events/activity/7/qrcode'));
    expect(request.request.method).toBe('GET');
    expect(request.request.responseType).toBe('blob');
    request.flush(png);
  });

  it('sends only the code; the backend identifies the participant from their session', () => {
    service.confirm(7, '3fa85f64-5717-4562-b3fc-2c963f66afa6').subscribe();
    const request = http.expectOne(r => r.url.endsWith('/events/activity/7/check-in'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ code: '3fa85f64-5717-4562-b3fc-2c963f66afa6' });
    request.flush({ response: 'Check-in realizado com sucesso.' });
  });
});
