import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ClubesService } from '../clubes/services/clubes.service';
import { EventsService } from '../events-page/services/events.service';
import { NewsService } from '../news-page/services/news.service';
import { GlobalSearchService } from './global-search.service';

describe('GlobalSearchService', () => {
  const eventsService = {
    search: vi.fn(() => of({
      content: [{
        id: 1, title: 'Semana de tecnologia', slug: 'semana-tech', description: 'Evento anual',
        content: 'Oficina de computação quântica para iniciantes.', cover_image_url: null,
        category: 'ACADEMIC_EDUCATIONAL', format: 'IN_PERSON', start_date: null, end_date: null,
      }], next_cursor: null, previous_cursor: null,
    })),
  };
  const newsService = {
    getAll: vi.fn(() => of({
      content: [{ id: 2, title: 'Novo laboratório', slug: 'novo-laboratorio', summary: 'Estrutura do curso', cover_image_url: null, featured: false, published_at: '2026-09-20' }],
      next_cursor: null, previous_cursor: null,
    })),
    getBySlug: vi.fn(() => of({
      id: 2, title: 'Novo laboratório', slug: 'novo-laboratorio', summary: 'Estrutura do curso', cover_image_url: null,
      featured: false, published_at: '2026-09-20', content: 'O laboratório recebeu novos servidores para pesquisa.',
    })),
  };
  const clubsService = {
    search: vi.fn(() => of({
      content: [{ id: 3, name: 'Clube de robótica', summary: 'Projetos semanais', cover_image_url: null, content: 'Encontros de visão computacional.', created_at: '', published_at: '2026-09-20', updated_at: '' }],
      next_cursor: null, previous_cursor: null,
    })),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        GlobalSearchService,
        { provide: EventsService, useValue: eventsService },
        { provide: NewsService, useValue: newsService },
        { provide: ClubesService, useValue: clubsService },
      ],
    });
  });

  it('finds each content type when the query appears only in its full content', () => {
    const service = TestBed.inject(GlobalSearchService);

    service.search('computação').subscribe((results) => {
      expect(results.events).toHaveLength(1);
      expect(results.events[0].matchLabel).toBe('Conteúdo');
    });
    service.search('servidores').subscribe((results) => {
      expect(results.news).toHaveLength(1);
      expect(results.news[0].matchLabel).toBe('Conteúdo');
    });
    service.search('visão').subscribe((results) => {
      expect(results.clubs).toHaveLength(1);
      expect(results.clubs[0]).toMatchObject({
        matchLabel: 'Conteúdo', link: ['/projetos/clubes'], queryParams: { club: 3 },
      });
    });

    expect(newsService.getBySlug).toHaveBeenCalledWith('novo-laboratorio');
  });
});
