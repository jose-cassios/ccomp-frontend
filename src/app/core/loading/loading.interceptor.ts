import { HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, finalize } from 'rxjs';
import { LoadingService } from './loading.service';

/** Tracks every HttpClient request so the application exposes one consistent loading state. */
export const loadingInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const loadingService = inject(LoadingService);
  loadingService.begin();

  // A synchronous failure (including DI errors) must also release the indicator.
  // Bound stalled network requests so SSR and browser navigation can settle.
  try {
    return next(request.clone({ timeout: request.timeout ?? 30000 })).pipe(
      finalize(() => loadingService.end()),
    );
  } catch (error) {
    loadingService.end();
    throw error;
  }
};
