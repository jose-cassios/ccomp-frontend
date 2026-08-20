import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { HeroHighlightsService } from './hero-highlights.service';

describe('HeroHighlightsService', () => {
  const api = { get: vi.fn() };
  let service: HeroHighlightsService;

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [HeroHighlightsService, { provide: ApiService, useValue: api }],
    });
    service = TestBed.inject(HeroHighlightsService);
  });

  it('should map the automatic highlights returned by the API', () => {
    api.get.mockReturnValue(of({
      news: [{
        id: 1,
        title: 'Notícia',
        summary: 'Resumo',
        slug: 'noticia',
        cover_image_url: null,
      }],
      events: [],
      clubs: [],
    }));

    service.getAll().subscribe((highlights) => {
      expect(highlights).toEqual([{
        id: 'NEWS:1',
        source_type: 'NEWS',
        source_id: 1,
        title: 'Notícia',
        summary: 'Resumo',
        image_url: null,
        label: 'Notícia em destaque',
        link: '/news/noticia',
      }]);
    });

    expect(api.get).toHaveBeenCalledWith('/highlights');
  });
});
