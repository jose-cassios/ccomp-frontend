import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { NewsUpdatePayload } from '../interface/news.interface';
import { NewsService } from './news.service';

describe('NewsService', () => {
  const api = {
    get: vi.fn(() => of({})),
    post: vi.fn(() => of({})),
    patch: vi.fn(() => of({})),
  };
  let service: NewsService;

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [NewsService, { provide: ApiService, useValue: api }],
    });
    service = TestBed.inject(NewsService);
  });

  it('should use the separate administrative endpoint when loading by id', () => {
    service.getById(9).subscribe();
    expect(api.get).toHaveBeenCalledWith('/news/admin/9');
  });

  it('should send the exact update DTO through PATCH and publish with POST', () => {
    const payload: NewsUpdatePayload = {
      title: 'Título válido',
      summary: 'Resumo válido',
      cover_image_url: 'https://example.com/capa.jpg',
      featured: true,
      content: 'Conteúdo válido da notícia.',
    };

    service.update(9, payload).subscribe();
    service.publish(9).subscribe();

    expect(api.patch).toHaveBeenCalledWith('/news/9', payload);
    expect(api.post).toHaveBeenCalledWith('/news/9/publish', {});
  });
});
