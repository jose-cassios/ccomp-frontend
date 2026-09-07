import { HttpEvent, HttpRequest } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { loadingInterceptor } from './loading.interceptor';
import { LoadingService } from './loading.service';

describe('loadingInterceptor', () => {
  it('exposes loading while a request is pending and clears it on completion', () => {
    TestBed.configureTestingModule({ providers: [LoadingService] });
    const loadingService = TestBed.inject(LoadingService);
    const response$ = new Subject<HttpEvent<unknown>>();
    const request = new HttpRequest('GET', '/test');

    const result = TestBed.runInInjectionContext(() => loadingInterceptor(request, () => response$));
    result.subscribe();

    expect(loadingService.isLoading()).toBe(true);

    response$.complete();
    expect(loadingService.isLoading()).toBe(false);
  });
});
