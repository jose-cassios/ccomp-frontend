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

  it('should map the current club DTO fields', () => {
    api.get.mockReturnValue(of({
      news: [],
      events: [],
      clubs: [{
        id: 7,
        name: 'Clube de Robótica',
        summary: 'Projetos de automação.',
        cover_image_url: 'https://example.com/robotica.jpg',
        content: null,
        created_at: '2026-08-20T10:00:00',
        published_at: '2026-08-20T11:00:00',
        updated_at: '2026-08-20T11:00:00',
      }],
    }));

    service.getAll().subscribe((highlights) => {
      expect(highlights[0]).toEqual(expect.objectContaining({
        source_type: 'CLUB',
        title: 'Clube de Robótica',
        summary: 'Projetos de automação.',
        image_url: 'https://example.com/robotica.jpg',
      }));
    });
  });
});
