import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';
import { CertificatesService } from '../../services/certificates.service';
import { CertificateValidationComponent } from './certificate-validation.component';

describe('Public certificate validation', () => {
  const api = { validate: vi.fn() };
  const params = new BehaviorSubject(convertToParamMap({ code: 'ABC12345' }));
  const response = { code: 'ABC12345', participant_name: 'Ana', event_title: 'Evento', activity_title: null, workload_hours: '8 horas', issued_at: '2026-10-26T12:00:00' };
  beforeEach(() => {
    vi.resetAllMocks(); params.next(convertToParamMap({ code: 'ABC12345' }));
    api.validate.mockReturnValue(of(response));
    TestBed.configureTestingModule({ imports: [CertificateValidationComponent], providers: [provideRouter([]),
      { provide: CertificatesService, useValue: api },
      { provide: ActivatedRoute, useValue: { paramMap: params, snapshot: { paramMap: convertToParamMap({ code: 'ABC12345' }) } } },
    ] });
  });
  it('validates a URL code without requiring a login and renders the public fields', () => {
    const fixture = TestBed.createComponent(CertificateValidationComponent); fixture.detectChanges();
    expect(api.validate).toHaveBeenCalledWith('ABC12345');
    expect(fixture.nativeElement.textContent).toContain('Certificado válido');
    expect(fixture.nativeElement.textContent).toContain('8 horas');
  });
  it('clears previous validity and allows retry of the same URL after an error', () => {
    api.validate.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 404 })));
    const fixture = TestBed.createComponent(CertificateValidationComponent); fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.result()).toBeNull(); expect(component.error()).toContain('Não encontramos');
    component.submit();
    expect(api.validate).toHaveBeenCalledTimes(2); expect(component.error()).toBeNull();
    expect(component.result()?.participant_name).toBe('Ana');
  });
  it('cancels a pending lookup when the URL code changes', () => {
    const first = new Subject<typeof response>(); api.validate.mockReturnValueOnce(first);
    const component = TestBed.createComponent(CertificateValidationComponent).componentInstance; component.ngOnInit();
    expect(component.loading()).toBe(true);
    params.next(convertToParamMap({ code: 'NEW12345' }));
    first.next({ ...response, participant_name: 'Stale response' });
    expect(component.result()?.participant_name).toBe('Ana'); expect(component.loading()).toBe(false);
  });
});
