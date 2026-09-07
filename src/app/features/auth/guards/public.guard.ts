import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const publicGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const returnUrl = route.queryParamMap.get('returnUrl');
  const destination = returnUrl?.startsWith('/') && !returnUrl.startsWith('//') && !returnUrl.startsWith('/login')
    ? returnUrl
    : '/';

  return authService.restoreSession().pipe(
    map((authenticated) => authenticated ? router.parseUrl(destination) : true),
  );
};
