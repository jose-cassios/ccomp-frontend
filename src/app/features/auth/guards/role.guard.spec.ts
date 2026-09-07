import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { firstValueFrom, Observable, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { roleGuard } from './role.guard';

describe('roleGuard', () => {
  const deniedTree = { denied: true };
  const loginTree = { login: true };
  const router = {
    createUrlTree: vi.fn((commands: string[]) => commands[0] === '/login' ? loginTree : deniedTree),
  };
  const authService = {
    isAuthenticatedValue: true,
    getRefreshToken: vi.fn(() => 'refresh-token'),
    refreshToken: vi.fn(() => of({ access_token: 'new-token' })),
    hasAnyRole: vi.fn(() => true),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    authService.isAuthenticatedValue = true;
    authService.getRefreshToken.mockReturnValue('refresh-token');
    authService.refreshToken.mockReturnValue(of({ access_token: 'new-token' }));
    authService.hasAnyRole.mockReturnValue(true);
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('refreshes the JWT roles before allowing a protected route', async () => {
    const result = TestBed.runInInjectionContext(() => roleGuard(
      { data: { roles: ['ADM'] } } as unknown as ActivatedRouteSnapshot,
      { url: '/admin/usuarios' } as RouterStateSnapshot,
    ));

    expect(await firstValueFrom(result as Observable<unknown>)).toBe(true);
    expect(authService.refreshToken).toHaveBeenCalledOnce();
    expect(authService.hasAnyRole).toHaveBeenCalledWith(['ADM']);
  });

  it('denies access after refresh when the updated role is not allowed', async () => {
    authService.hasAnyRole.mockReturnValue(false);
    const result = TestBed.runInInjectionContext(() => roleGuard(
      { data: { roles: ['ADM'] } } as unknown as ActivatedRouteSnapshot,
      { url: '/admin/usuarios' } as RouterStateSnapshot,
    ));

    expect(await firstValueFrom(result as Observable<unknown>)).toBe(deniedTree);
  });
});
