import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, of, throwError } from 'rxjs';
import { CertificateDownloadComponent } from './certificate-download.component';
import { CertificatesService } from '../../services/certificates.service';
import { AuthService } from '../../../auth/services/auth.service';

describe('Certificate download', () => {
  const api = { download: vi.fn() };
  const auth = { isAuthenticatedState: vi.fn() };
  beforeEach(() => {
    vi.resetAllMocks(); auth.isAuthenticatedState.mockReturnValue(true);
    Object.defineProperty(URL, 'createObjectURL', { value: vi.fn(() => 'blob:download'), configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), configurable: true });
    api.download.mockReturnValue(of(new Blob()));
    TestBed.configureTestingModule({ imports: [CertificateDownloadComponent], providers: [provideRouter([]),
      { provide: CertificatesService, useValue: api }, { provide: AuthService, useValue: auth },
    ] });
  });
  function create() {
    const fixture = TestBed.createComponent(CertificateDownloadComponent);
    fixture.componentRef.setInput('resourceId', 9); fixture.componentRef.setInput('scope', 'activity');
    fixture.detectChanges(); return fixture;
  }
  it('asks anonymous participants to login with a return URL', () => {
    auth.isAuthenticatedState.mockReturnValue(false);
    const router = TestBed.inject(Router); const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const component = create().componentInstance; component.download();
    expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: router.url } });
    expect(api.download).not.toHaveBeenCalled();
  });
  it('downloads once, reports success and releases its object URL on destruction', () => {
    const pending = new Subject<Blob>(); api.download.mockReturnValue(pending);
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const fixture = create(); const component = fixture.componentInstance;
    component.download(); component.download();
    expect(api.download).toHaveBeenCalledTimes(1); expect(component.busy()).toBe(true);
    pending.next(new Blob()); pending.complete();
    expect(click).toHaveBeenCalledTimes(1); expect(component.success()).toContain('download');
    expect(component.busy()).toBe(false); fixture.destroy();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:download');
  });
  it('displays backend check-in errors beside the download action', () => {
    api.download.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { message: 'Faça o check-in da atividade.' } })));
    const fixture = create(); fixture.componentInstance.download(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain('Faça o check-in');
    expect(fixture.componentInstance.success()).toBeNull(); expect(fixture.componentInstance.busy()).toBe(false);
  });
});
