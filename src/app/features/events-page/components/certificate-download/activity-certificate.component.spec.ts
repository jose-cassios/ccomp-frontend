import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { CertificatesService } from '../../services/certificates.service';
import { ActivityCertificateComponent } from './activity-certificate.component';

describe('Verified participant activity certificate', () => {
  const api = { download: vi.fn() };
  beforeEach(() => {
    api.download.mockReset().mockReturnValue(of(new Blob(['png'])));
    Object.defineProperty(URL, 'createObjectURL', { value: vi.fn(() => 'blob:certificate'), configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), configurable: true });
    TestBed.configureTestingModule({ imports: [ActivityCertificateComponent], providers: [{ provide: CertificatesService, useValue: api }] });
  });
  function create() {
    const fixture = TestBed.createComponent(ActivityCertificateComponent);
    fixture.componentRef.setInput('activityId', 5); fixture.componentRef.setInput('userId', 'participant');
    fixture.detectChanges(); return fixture;
  }
  it('offers the file only after the API confirms enrollment and attendance, without another request to download', () => {
    const pending = new Subject<Blob>(); api.download.mockReturnValue(pending);
    const fixture = create();
    expect(api.download).toHaveBeenCalledWith(5, 'activity'); expect(fixture.nativeElement.querySelector('a')).toBeNull();
    fixture.componentInstance.verify(); expect(api.download).toHaveBeenCalledOnce();
    pending.next(new Blob(['png'])); pending.complete(); fixture.detectChanges();
    const link = fixture.nativeElement.querySelector('a');
    expect(link.textContent).toContain('Solicitar certificado'); expect(link.getAttribute('href')).toBe('blob:certificate');
    expect(link.getAttribute('download')).toBe('certificado-atividade-5.png');
    fixture.detectChanges(); expect(api.download).toHaveBeenCalledOnce();
    fixture.destroy(); expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:certificate');
  });
  it.each([400, 401, 403, 404])('does not offer a certificate on API rejection %s and allows rechecking after presence is confirmed', status => {
    api.download.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status })));
    const fixture = create(); expect(fixture.nativeElement.querySelector('a')).toBeNull();
    fixture.nativeElement.querySelector('button').click(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('a')).not.toBeNull();
  });
  it('does not treat network errors as a confirmation and supports retry', () => {
    api.download.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })));
    const fixture = create(); expect(fixture.nativeElement.querySelector('[role=alert]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a')).toBeNull(); expect(fixture.componentInstance.loading()).toBe(false);
  });
  it('cancels stale requests when the activity or account changes', () => {
    const first = new Subject<Blob>(); api.download.mockReturnValueOnce(first);
    const fixture = create(); fixture.componentRef.setInput('activityId', 6); fixture.componentRef.setInput('userId', 'other'); fixture.detectChanges();
    expect(first.observed).toBe(false); expect(api.download).toHaveBeenLastCalledWith(6, 'activity');
    fixture.componentRef.setInput('userId', ''); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('a')).toBeNull(); expect(api.download).toHaveBeenCalledTimes(2);
  });
});
