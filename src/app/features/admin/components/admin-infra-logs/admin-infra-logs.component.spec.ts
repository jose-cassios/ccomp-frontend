import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Subject } from 'rxjs';
import { AdminInfraLogsComponent } from './admin-infra-logs.component';
import { AdminInfraLogsService } from '../../services/admin-infra-logs.service';
import { AuthService } from '../../../auth/services/auth.service';
import { InfraLogsResponse } from '../../models/admin-infra-log.model';

describe('AdminInfraLogsComponent', () => {
  const service = { search: vi.fn() };
  const auth = { hasAnyRole: vi.fn() };
  const empty: InfraLogsResponse = { logs: [], start: '2026-10-26T12:00:00Z', end: '2026-10-26T13:00:00Z', limit: 100 };
  beforeEach(() => {
    vi.clearAllMocks();
    auth.hasAnyRole.mockReturnValue(true);
    service.search.mockReturnValue(of(empty));
    TestBed.configureTestingModule({ imports: [AdminInfraLogsComponent], providers: [
      { provide: AdminInfraLogsService, useValue: service }, { provide: AuthService, useValue: auth },
    ] });
  });

  it('loads the last hour and displays the empty state', () => {
    const fixture = TestBed.createComponent(AdminInfraLogsComponent);
    fixture.detectChanges();
    const filter = service.search.mock.calls[0][0];
    expect(Date.parse(filter.end) - Date.parse(filter.start)).toBe(3_600_000);
    expect(filter.limit).toBe(100);
    expect(fixture.nativeElement.textContent).toContain('Nenhum log encontrado');
  });

  it('does not request logs for non-admin accounts', () => {
    auth.hasAnyRole.mockReturnValue(false);
    const fixture = TestBed.createComponent(AdminInfraLogsComponent);
    fixture.detectChanges();
    expect(service.search).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('somente para administradores');
  });

  it('rejects reversed dates, periods over seven days and invalid limits', () => {
    const component = TestBed.createComponent(AdminInfraLogsComponent).componentInstance;
    component.form.patchValue({ start: '2026-10-26T12:00', end: '2026-10-25T12:00' });
    component.reload();
    expect(component.error()).toContain('datas válidas');
    component.form.patchValue({ start: '2026-10-01T12:00', end: '2026-10-26T12:00' });
    component.reload();
    expect(component.error()).toContain('7 dias');
    component.form.patchValue({ start: '', end: '', limit: 501 });
    component.reload();
    expect(component.error()).toContain('1 a 500');
    expect(service.search).not.toHaveBeenCalled();
  });

  it('prevents duplicate requests, clears stale results on failure and allows retry', () => {
    const component = TestBed.createComponent(AdminInfraLogsComponent).componentInstance;
    const response = new Subject<InfraLogsResponse>();
    service.search.mockReturnValue(response);
    component.result.set(empty);
    component.reload();
    component.reload();
    expect(service.search).toHaveBeenCalledTimes(1);
    expect(component.loading()).toBe(true);
    response.error(new HttpErrorResponse({ status: 403 }));
    expect(component.loading()).toBe(false);
    expect(component.result()).toBeNull();
    expect(component.error()).toContain('permissão');
    service.search.mockReturnValue(of(empty));
    component.reload();
    expect(component.error()).toBeNull();
    expect(component.result()).toEqual(empty);
  });

  it('renders log messages as text and preserves the service name', () => {
    service.search.mockReturnValue(of({ ...empty, logs: [{ timestamp: empty.start, service_name: 'ccomp-backend', container: null, level: null, message: '<script>alert(1)</script>\nlinha 2' }] }));
    const fixture = TestBed.createComponent(AdminInfraLogsComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('pre').textContent).toContain('<script>alert(1)</script>');
    expect(fixture.nativeElement.querySelector('script')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('ccomp-backend');
  });
});
