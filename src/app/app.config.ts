import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { authInterceptor } from './features/auth/interceptors/auth.interceptor';
import { loadingInterceptor } from './core/loading/loading.interceptor';
import { AuthService } from './features/auth/services/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withFetch(), withInterceptors([loadingInterceptor, authInterceptor])),
    provideAppInitializer(() => inject(AuthService).restoreSession()),
    provideRouter(routes),
    provideClientHydration(withEventReplay())
  ]
};
