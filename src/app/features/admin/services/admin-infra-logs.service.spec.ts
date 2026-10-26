import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminInfraLogsService } from './admin-infra-logs.service';

describe('AdminInfraLogsService', () => {
  let http: HttpTestingController;
  let service: AdminInfraLogsService;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(AdminInfraLogsService);
  });
  afterEach(() => http.verify());

  it('uses GET query parameters in camelCase and reads snake_case response fields', () => {
    const filter = { serviceName: 'postgres-db' as const, container: 'ccomp-postgres-1', level: 'error' as const,
      search: 'a & b', start: '2026-10-26T12:00:00Z', end: '2026-10-26T13:00:00Z', limit: 50 };
    service.search(filter).subscribe(response => expect(response.logs[0].service_name).toBe('postgres-db'));
    const req = http.expectOne(r => r.url.endsWith('/admin/infra-logs'));
    expect(req.request.method).toBe('GET');
    for (const [key, value] of Object.entries(filter)) expect(req.request.params.get(key)).toBe(String(value));
    req.flush({ logs: [{ timestamp: filter.start, service_name: 'postgres-db', container: null, level: 'error', message: 'a & b' }], start: filter.start, end: filter.end, limit: 50 });
  });

  it('omits unspecified parameters so backend defaults remain available', () => {
    service.search().subscribe();
    const req = http.expectOne(r => r.url.endsWith('/admin/infra-logs'));
    expect(req.request.params.keys()).toEqual([]);
    req.flush({ logs: [], start: '', end: '', limit: 100 });
  });
});
