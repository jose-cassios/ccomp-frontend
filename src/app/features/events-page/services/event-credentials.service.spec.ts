import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiConfig } from '../../../core/api/api.config';
import { EventCredentialsService } from './event-credentials.service';

describe('Event reception API contract', () => {
  let service: EventCredentialsService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(),
      { provide: ApiConfig, useValue: { buildUrl: (path: string) => '/api' + path } },
    ] });
    service = TestBed.inject(EventCredentialsService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('searches enrollments and normalizes email values', () => {
    service.search(4, ' Ana ').subscribe(rows => expect(rows[0].enrollment.user.email_address).toBe('ana@example.com'));
    const req = http.expectOne('/api/events/4/credentials/manual/search');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ search_term: 'Ana' });
    req.flush([{ enrollment: { id: 9, status: 'CONFIRMED', user: { id: 'user', name: 'Ana', email_address: { value: 'ana@example.com' } } }, eligible: true, credentialed: false }]);
  });
  it('uses enrollment ID and station for manual reception, not activity attendance routes', () => {
    service.credential(4, 9, ' Entrada ').subscribe();
    const req = http.expectOne('/api/events/4/credentials/manual');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ enrollment_id: 9, station: 'Entrada' });
    req.flush({ result: 'CREATED', enrollment_id: 9 });
    service.summary(4).subscribe();
    http.expectOne('/api/events/4/credentials/summary').flush({ eligible: 10, credentialed: 1, remaining: 9 });
  });
  it('grants and revokes operational access using the existing account ID', () => {
    service.addOperator(4, ' user-id ').subscribe();
    const add = http.expectOne('/api/events/4/credentials/operators/user-id');
    expect(add.request.method).toBe('PUT'); expect(add.request.body).toBeNull(); add.flush(null);
    service.removeOperator(4, ' user-id ').subscribe();
    const remove = http.expectOne('/api/events/4/credentials/operators/user-id');
    expect(remove.request.method).toBe('DELETE'); remove.flush(null);
  });
});
