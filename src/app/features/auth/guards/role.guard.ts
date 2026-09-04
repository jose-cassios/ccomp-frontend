import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const allowedRoles = (route.data['roles'] as readonly string[] | undefined) ?? [];
  const denied = () => router.createUrlTree(['/noticias'], {
    queryParams: { acesso: 'negado' },
  });
  const checkAccess = () => allowedRoles.length > 0 && authService.hasAnyRole(allowedRoles)
    ? true
    : denied();

  if (!authService.isAuthenticatedValue || !authService.getRefreshToken()) {
    return checkAccess();
  }

  // Roles are embedded in the access token. Refreshing before entering a protected
  // area makes promotions and revocations effective without requiring a new login.
  return authService.refreshToken().pipe(
    map(() => checkAccess()),
    catchError(() => of(router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url },
    }))),
  );
};
