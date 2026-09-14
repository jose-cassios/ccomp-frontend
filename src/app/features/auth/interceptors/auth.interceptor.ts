import { inject } from '@angular/core';
import {
  HttpRequest,
  HttpHandlerFn,
  HttpEvent,
  HttpInterceptorFn,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, catchError, throwError, switchMap } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ApiConfig } from '../../../core/api/api.config';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const apiConfig = inject(ApiConfig);
  // Never leak bearer tokens to other origins or send an expired access token to refresh/login.
  if (!req.url.startsWith(`${apiConfig.baseUrl}/`) || req.url.startsWith(`${apiConfig.authUrl}/`)) {
    return next(req);
  }
  const authService = inject(AuthService);
  const token = authService.getToken();

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (
        error.status === 401 &&
        token &&
        authService.getRefreshToken() &&
        !req.url.startsWith(`${apiConfig.authUrl}/`)
      ) {
        return authService.refreshToken().pipe(
          switchMap(() => {
            const newToken = authService.getToken();
            const newReq = newToken
              ? req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } })
              : req;
            return next(newReq);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
