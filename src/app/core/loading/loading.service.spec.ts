import { TestBed } from '@angular/core/testing';
import { LoadingService } from './loading.service';

describe('LoadingService', () => {
  it('keeps the loading state active until every pending request has completed', () => {
    const service = TestBed.inject(LoadingService);

    service.begin();
    service.begin();
    service.end();

    expect(service.isLoading()).toBe(true);

    service.end();
    expect(service.isLoading()).toBe(false);
  });
});
