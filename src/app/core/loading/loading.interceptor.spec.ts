import { HttpContext, HttpEvent, HttpRequest } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { loadingInterceptor, SKIP_GLOBAL_LOADING } from './loading.interceptor';
import { LoadingService } from './loading.service';

describe('loadingInterceptor', () => {
  it('does not count background covers or clear a concurrent foreground request', () => {
    const loading = TestBed.inject(LoadingService);
    const foreground = new Subject<HttpEvent<unknown>>();
    const background = new Subject<HttpEvent<unknown>>();
    const begin = vi.spyOn(loading, 'begin');
    TestBed.runInInjectionContext(() => loadingInterceptor(new HttpRequest('GET', '/event'), () => foreground)).subscribe();
    const request = new HttpRequest('GET', '/cover', {
      context: new HttpContext().set(SKIP_GLOBAL_LOADING, true),
    });
    TestBed.runInInjectionContext(() => loadingInterceptor(request, req => {
      expect(req.timeout).toBe(30000);
      return background;
    })).subscribe();
    expect(begin).toHaveBeenCalledTimes(1);
    background.complete();
    expect(loading.isLoading()).toBe(true);
    foreground.complete();
    expect(loading.isLoading()).toBe(false);
  });
  it('clears loading when a downstream interceptor throws synchronously', () => {
    TestBed.configureTestingModule({ providers: [LoadingService] });
    const loading = TestBed.inject(LoadingService);
    expect(() => TestBed.runInInjectionContext(() => loadingInterceptor(
      new HttpRequest('GET', '/test'),
      () => { throw new Error('downstream failure'); },
    ))).toThrow('downstream failure');
    expect(loading.isLoading()).toBe(false);
  });

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
