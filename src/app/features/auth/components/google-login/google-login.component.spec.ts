import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { GoogleLoginComponent } from './google-login.component';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../../../environments/environment';

describe('Google authentication', () => {
  const auth = { loginWithGoogle: vi.fn() };
  let returnUrl: string;
  const originalClientId = environment.googleClientId;
  afterEach(() => { environment.googleClientId = originalClientId; vi.unstubAllGlobals(); });
  beforeEach(() => {
    auth.loginWithGoogle.mockReset(); returnUrl = '/accept-editor-invite?code=abc';
    TestBed.configureTestingModule({ providers: [provideRouter([]),
      { provide: AuthService, useValue: auth },
      { provide: ActivatedRoute, useValue: { snapshot: { get queryParamMap() { return convertToParamMap({ returnUrl }); } } } },
    ] });
  });
  it('initializes the SDK with the configured client ID and renders only the Google icon', async () => {
    environment.googleClientId = 'configured-client.apps.googleusercontent.com';
    const initialize = vi.fn(); const renderButton = vi.fn();
    vi.stubGlobal('google', { accounts: { id: { initialize, renderButton } } });
    const fixture = TestBed.createComponent(GoogleLoginComponent);
    fixture.detectChanges(); await fixture.whenStable();
    expect(initialize).toHaveBeenCalledWith(expect.objectContaining({ client_id: environment.googleClientId, auto_select: false }));
    expect(renderButton).toHaveBeenCalledWith(expect.any(HTMLElement), expect.objectContaining({ type: 'icon' }));
    const pending = new Subject<unknown>(); auth.loginWithGoogle.mockReturnValue(pending);
    initialize.mock.calls[0][0].callback({ credential: 'verified-by-server' });
    expect(auth.loginWithGoogle).toHaveBeenCalledWith('verified-by-server');
    fixture.destroy();
    initialize.mock.calls[0][0].callback({ credential: 'stale-callback' });
    expect(auth.loginWithGoogle).toHaveBeenCalledTimes(1);
  });
  it('exchanges the credential once and resumes the invitation after login', () => {
    const pending = new Subject<unknown>(); auth.loginWithGoogle.mockReturnValue(pending);
    const fixture = TestBed.createComponent(GoogleLoginComponent);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const busy = vi.fn(); fixture.componentInstance.busyChange.subscribe(busy);
    fixture.componentInstance.authenticate('google-id-token'); fixture.componentInstance.authenticate('google-id-token');
    expect(auth.loginWithGoogle).toHaveBeenCalledExactlyOnceWith('google-id-token');
    expect(busy).toHaveBeenCalledWith(true);
    pending.next({}); pending.complete();
    expect(navigate).toHaveBeenCalledWith(returnUrl); expect(busy).toHaveBeenLastCalledWith(false);
  });
  it('does not redirect to an external return URL', () => {
    returnUrl = '//external.example'; auth.loginWithGoogle.mockReturnValue(of({}));
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    TestBed.createComponent(GoogleLoginComponent).componentInstance.authenticate('credential');
    expect(navigate).toHaveBeenCalledWith('/');
  });
  it('shows feedback and restores the form after an API error', () => {
    auth.loginWithGoogle.mockReturnValue(throwError(() => new Error('offline')));
    const component = TestBed.createComponent(GoogleLoginComponent).componentInstance;
    component.authenticate('credential');
    expect(component.busy()).toBe(false); expect(component.error()).toBeTruthy();
  });
});
