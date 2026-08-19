import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { HeroHighlightsService } from './hero-highlights.service';

describe('HeroHighlightsService', () => {
  const api = { get: vi.fn(() => of([])), put: vi.fn(() => of([])) };
  let service: HeroHighlightsService;

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [HeroHighlightsService, { provide: ApiService, useValue: api }],
    });
    service = TestBed.inject(HeroHighlightsService);
  });

  it('should use the global highlight endpoints', () => {
    service.getAll().subscribe();
    service.getCandidates('NEWS').subscribe();
    service.update([{ source_type: 'EVENT', source_id: 4 }]).subscribe();

    expect(api.get).toHaveBeenCalledWith('/highlights');
    expect(api.get).toHaveBeenCalledWith('/highlights/candidates/NEWS');
    expect(api.put).toHaveBeenCalledWith('/highlights', [{ source_type: 'EVENT', source_id: 4 }]);
  });
});
