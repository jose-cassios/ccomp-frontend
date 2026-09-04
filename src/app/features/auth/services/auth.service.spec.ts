import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { AuthService } from './auth.service';

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
});
