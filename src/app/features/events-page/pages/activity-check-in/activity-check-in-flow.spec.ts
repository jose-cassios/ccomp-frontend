import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { authGuard } from '../../../auth/guards/auth.guard';
import { publicGuard } from '../../../auth/guards/public.guard';
import { authInterceptor } from '../../../auth/interceptors/auth.interceptor';
import { LoginPageComponent } from '../../../auth/pages/login-page/login-page.component';
import { RegisterPageComponent } from '../../../auth/pages/register-page/register-page.component';
import { AUTH_CONFIG } from '../../../auth/config/auth.config';
import { ActivityCheckInPageComponent } from './activity-check-in.component';

describe('QR → authentication → automatic check-in', () => {
  const code = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
  const destination = `/check-in?activity_id=7&code=${code}`;
  const token = (seconds: number) => `header.${btoa(JSON.stringify({
    sub: 'participant', exp: Math.floor(Date.now() / 1000) + seconds, roles: ['ROLE_USER'],
  }))}.signature`;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(withInterceptors([authInterceptor])),
      provideHttpClientTesting(),
      provideRouter([
        { path: 'check-in', component: ActivityCheckInPageComponent, canActivate: [authGuard] },
        { path: 'login', component: LoginPageComponent, canActivate: [publicGuard] },
        { path: 'register', component: RegisterPageComponent },
      ]),
    ] });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => { http.verify(); localStorage.clear(); });

  function flushProfile() {
    http.expectOne(r => r.url.endsWith('/users/me')).flush({
      id: 'participant', name: 'Ana', email_address: 'ana@example.com', role: 'USER',
    });
  }

  async function verifyCheckIn(accessToken: string) {
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe(destination));
    const request = http.expectOne(r => r.url.endsWith('/events/activity/7/check-in'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ code });
    expect(request.request.headers.get('Authorization')).toBe(`Bearer ${accessToken}`);
    request.flush({ response: 'Check-in realizado com sucesso.' });
    http.expectNone(r => r.url.endsWith('/events/activity/7/check-in'));
  }

  it('preserves the QR parameters through login and posts with the new token automatically', async () => {
    const harness = await RouterTestingHarness.create();
    const login = await harness.navigateByUrl(destination, LoginPageComponent);
    expect(TestBed.inject(Router).parseUrl(TestBed.inject(Router).url).queryParams['returnUrl']).toBe(destination);
    http.expectNone(r => r.url.endsWith('/check-in'));
    login.onLogin({ email: 'ana@example.com', password: 'test-password' });
    const accessToken = token(3600);
    http.expectOne(r => r.url.endsWith('/auth/sign-in')).flush({ access_token: accessToken, refresh_token: 'refresh' });
    flushProfile();
    await verifyCheckIn(accessToken);
  });

  it('uses an existing valid session without asking for another login', async () => {
    const accessToken = token(3600);
    localStorage.setItem(AUTH_CONFIG.TOKEN_KEY, accessToken);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(destination, ActivityCheckInPageComponent);
    flushProfile();
    http.expectNone(r => r.url.endsWith('/auth/sign-in'));
    await verifyCheckIn(accessToken);
  });

  it('waits for an expired token to refresh before posting presence', async () => {
    localStorage.setItem(AUTH_CONFIG.TOKEN_KEY, token(-60));
    localStorage.setItem(AUTH_CONFIG.REFRESH_TOKEN_KEY, 'refresh');
    const harness = await RouterTestingHarness.create();
    const navigation = harness.navigateByUrl(destination, ActivityCheckInPageComponent);
    const refresh = await vi.waitFor(() => http.expectOne(r => r.url.endsWith('/auth/refresh')));
    http.expectNone(r => r.url.endsWith('/check-in'));
    const accessToken = token(3600);
    refresh.flush({ access_token: accessToken, refresh_token: 'rotated-refresh' });
    flushProfile();
    await navigation;
    await verifyCheckIn(accessToken);
  });

  it('preserves the invitation destination through registration before login', async () => {
    const harness = await RouterTestingHarness.create();
    const login = await harness.navigateByUrl(destination, LoginPageComponent);
    login.navigateToRegister();
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toContain('/register?'));
    const register = harness.routeDebugElement!.componentInstance as RegisterPageComponent;
    register.onRegister({ name: 'Ana', email: 'ana@example.com', password: 'test-password' });
    http.expectOne(r => r.url.endsWith('/auth/sign-up')).flush({ response: 'Conta criada' });
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toContain('/login?'));
    expect(TestBed.inject(Router).parseUrl(TestBed.inject(Router).url).queryParams['returnUrl']).toBe(destination);
    const nextLogin = harness.routeDebugElement!.componentInstance as LoginPageComponent;
    nextLogin.onLogin({ email: 'ana@example.com', password: 'test-password' });
    const accessToken = token(3600);
    http.expectOne(r => r.url.endsWith('/auth/sign-in')).flush({ access_token: accessToken, refresh_token: 'refresh' });
    flushProfile();
    await verifyCheckIn(accessToken);
  });
});
