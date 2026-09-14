import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { AUTH_CONFIG } from '../config/auth.config';
import { AuthService } from './auth.service';
import { authInterceptor } from '../interceptors/auth.interceptor';
import { loadingInterceptor } from '../../../core/loading/loading.interceptor';
import { LoadingService } from '../../../core/loading/loading.service';

describe('AuthService roles', () => {
  const api = { post: vi.fn(), get: vi.fn() };

  beforeEach(() => {
    localStorage.clear();
    api.post.mockReset();
    api.get.mockReset();
    TestBed.configureTestingModule({
      providers: [AuthService, { provide: ApiService, useValue: api }],
    });
  });

  afterEach(() => localStorage.clear());

  it('should map the API STAFF role to the MODERATOR product role', () => {
    const payload = btoa(JSON.stringify({
      sub: 'd2bfffb6-3ff6-46a6-884a-38e0db08c387',
      roles: ['ROLE_STAFF'],
      exp: Math.floor(Date.now() / 1000) + 3600,
    })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    api.post.mockReturnValue(of({ accessToken: `header.${payload}.signature`, refreshToken: 'refresh' }));
    api.get.mockReturnValue(of({
      id: 'd2bfffb6-3ff6-46a6-884a-38e0db08c387',
      name: 'Usuário Staff',
      email_address: 'staff@example.com',
    }));

    const service = TestBed.inject(AuthService);
    service.login({ email: 'staff@example.com', password: 'secret' }).subscribe();

    expect(service.hasAnyRole(['MODERATOR'])).toBe(true);
    expect(service.hasAnyRole(['ADM'])).toBe(false);
  });

  it('should refresh changed roles without discarding the loaded profile', () => {
    const userId = 'd2bfffb6-3ff6-46a6-884a-38e0db08c387';
    const token = (role: string) => {
      const payload = btoa(JSON.stringify({
        sub: userId,
        roles: [role],
        exp: Math.floor(Date.now() / 1000) + 3600,
      })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      return `header.${payload}.signature`;
    };
    api.post
      .mockReturnValueOnce(of({ access_token: token('ROLE_USER'), refresh_token: 'refresh' }))
      .mockReturnValueOnce(of({ access_token: token('ROLE_STAFF') }));
    api.get.mockReturnValue(of({
      id: userId,
      name: 'Pessoa Usuária',
      email_address: 'pessoa@example.com',
    }));

    const service = TestBed.inject(AuthService);
    service.login({ email: 'pessoa@example.com', password: 'secret' }).subscribe();
    service.refreshToken().subscribe();

    expect(service.hasAnyRole(['MODERATOR'])).toBe(true);
    expect(service.getCurrentUser()).toMatchObject({
      id: userId,
      name: 'Pessoa Usuária',
      email: 'pessoa@example.com',
    });
  });

  it('should reflect the current database role returned by the profile endpoint', () => {
    const userId = 'd2bfffb6-3ff6-46a6-884a-38e0db08c387';
    const payload = btoa(JSON.stringify({
      sub: userId,
      roles: ['ROLE_USER'],
      exp: Math.floor(Date.now() / 1000) + 3600,
    })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    api.post.mockReturnValue(of({ access_token: `header.${payload}.signature`, refresh_token: 'refresh' }));
    api.get.mockReturnValue(of({
      id: userId,
      name: 'Pessoa Administradora',
      email_address: 'admin@example.com',
      role: 'ADMIN',
    }));

    const service = TestBed.inject(AuthService);
    service.login({ email: 'admin@example.com', password: 'secret' }).subscribe();

    expect(service.hasAnyRole(['ADM'])).toBe(true);
  });

  it('should renew an expired access token before treating the stored session as logged out', () => {
    const userId = 'd2bfffb6-3ff6-46a6-884a-38e0db08c387';
    const token = (expiration: number) => {
      const payload = btoa(JSON.stringify({
        sub: userId,
        roles: ['ROLE_USER'],
        exp: expiration,
      })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      return `header.${payload}.signature`;
    };
    const expiredToken = token(Math.floor(Date.now() / 1000) - 60);
    const refreshedToken = token(Math.floor(Date.now() / 1000) + 3600);
    localStorage.setItem(AUTH_CONFIG.TOKEN_KEY, expiredToken);
    localStorage.setItem(AUTH_CONFIG.REFRESH_TOKEN_KEY, 'valid-refresh-token');
    api.post.mockReturnValue(of({ access_token: refreshedToken, refresh_token: 'new-refresh-token' }));
    api.get.mockReturnValue(of({
      id: userId,
      name: 'Pessoa Usuária',
      email_address: 'pessoa@example.com',
    }));

    const service = TestBed.inject(AuthService);

    expect(api.post).not.toHaveBeenCalled();
    service.restoreSession().subscribe();
    expect(service.isAuthenticatedValue).toBe(true);
    expect(api.post).toHaveBeenCalledWith('/auth/refresh', { refresh_token: 'valid-refresh-token' });
    expect(localStorage.getItem(AUTH_CONFIG.TOKEN_KEY)).toBe(refreshedToken);
  });
});

describe('AuthService session restoration with the real interceptor chain', () => {
  const token = (expiresIn: number) => `header.${btoa(JSON.stringify({
    sub: 'user-1', exp: Math.floor(Date.now() / 1000) + expiresIn, roles: ['ROLE_USER'],
  }))}.signature`;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(withInterceptors([loadingInterceptor, authInterceptor])),
      provideHttpClientTesting(),
    ] });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('restores a saved session without circular DI or leaving loading stuck on reload', () => {
    const accessToken = token(3600);
    localStorage.setItem(AUTH_CONFIG.TOKEN_KEY, accessToken);
    const auth = TestBed.inject(AuthService);
    const loading = TestBed.inject(LoadingService);
    http.expectNone((req) => req.url.endsWith('/users/me'));
    expect(loading.isLoading()).toBe(false);

    auth.restoreSession().subscribe();
    const profile = http.expectOne((req) => req.url.endsWith('/users/me'));
    expect(profile.request.headers.get('Authorization')).toBe(`Bearer ${accessToken}`);
    expect(profile.request.timeout).toBe(30000);
    expect(loading.isLoading()).toBe(true);
    profile.flush({ id: 'user-1', name: 'Pessoa', email_address: 'pessoa@example.com' });
    expect(auth.isAuthenticatedValue).toBe(true);
    expect(loading.isLoading()).toBe(false);
  });

  it('shares refresh calls while restoring an expired session', () => {
    localStorage.setItem(AUTH_CONFIG.TOKEN_KEY, token(-60));
    localStorage.setItem(AUTH_CONFIG.REFRESH_TOKEN_KEY, 'refresh');
    const auth = TestBed.inject(AuthService);
    auth.restoreSession().subscribe();
    auth.restoreSession().subscribe();
    auth.refreshToken().subscribe();
    const refresh = http.expectOne((req) => req.url.endsWith('/auth/refresh'));
    expect(refresh.request.headers.has('Authorization')).toBe(false);
    refresh.flush({ access_token: token(3600) });
    http.expectOne((req) => req.url.endsWith('/users/me')).flush({
      id: 'user-1', name: 'Pessoa', email_address: 'pessoa@example.com',
    });
    expect(TestBed.inject(LoadingService).isLoading()).toBe(false);
    expect(auth.isAuthenticatedValue).toBe(true);
  });
});
