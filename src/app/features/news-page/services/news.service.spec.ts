import { TestBed } from '@angular/core/testing';
import { HttpParams } from '@angular/common/http';
import { of } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { NewsUpdatePayload } from '../interface/news.interface';
import { NewsService } from './news.service';

describe('NewsService', () => {
  const api = {
    get: vi.fn((_endpoint: string) => of({})),
    post: vi.fn(
      (_endpoint: string, _body: unknown, _options?: { params?: HttpParams }) => of({}),
    ),
    patch: vi.fn((_endpoint: string, _body: unknown) => of({})),
    delete: vi.fn((_endpoint: string) => of({})),
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

  it('should search news with the filter in the request body and cursor pagination in params', () => {
    service.getAll({ featured: true }, 'cursor-2', 20).subscribe();

    expect(api.post).toHaveBeenCalledWith(
      '/news/search',
      { featured: true },
      { params: expect.objectContaining({}) },
    );
    const params = api.post.mock.calls[0]?.[2]?.params;
    expect(params?.get('nextCursor')).toBe('cursor-2');
    expect(params?.get('pageSize')).toBe('20');
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

  it('should delete a news item by id', () => {
    service.delete(9).subscribe();
    expect(api.delete).toHaveBeenCalledWith('/news/9');
  });

  it('should manage news editors by email', () => {
    service.getEditors(9).subscribe();
    service.addEditor(9, 'editor+teste@example.com').subscribe();
    service.removeEditor(9, 'editor+teste@example.com').subscribe();

    expect(api.get).toHaveBeenCalledWith('/news/9/editors');
    expect(api.post).toHaveBeenCalledWith('/news/9/editors/editor%2Bteste%40example.com', {});
    expect(api.delete).toHaveBeenCalledWith('/news/9/editors/editor%2Bteste%40example.com');
  });
});
