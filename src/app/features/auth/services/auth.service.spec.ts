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
});
