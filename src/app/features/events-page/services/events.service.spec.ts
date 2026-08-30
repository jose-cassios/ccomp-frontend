import { HttpParams } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { EventsService } from './events.service';

describe('EventsService', () => {
  const api = {
    get: vi.fn((endpoint: string) => {
      if (endpoint.startsWith('/users/me/')) return of([]);
      if (endpoint.endsWith('/editors')) return of({ content: [], nextCursor: null });
      return of({
        id: 9,
        title: 'Evento de teste',
        slug: 'evento-de-teste',
        summary: 'Resumo do evento',
        format: 'ONLINE',
        category: 'ACADEMIC_EDUCATIONAL',
        startDate: '2026-08-22T10:00:00',
        endDate: '2026-08-22T12:00:00',
      });
    }),
    post: vi.fn(),
    patch: vi.fn((_endpoint: string, _body: unknown) => of({
      id: 9,
      title: 'Evento de teste',
      slug: 'evento-de-teste',
      summary: 'Resumo do evento',
      format: 'ONLINE',
      category: 'ACADEMIC_EDUCATIONAL',
      startDate: '2026-08-22T10:00:00',
      endDate: '2026-08-22T12:00:00',
    })),
    delete: vi.fn((_endpoint: string) => of({})),
  };
  let service: EventsService;

  beforeEach(() => {
    vi.clearAllMocks();
    api.post.mockImplementation(
      (endpoint: string, _body: unknown, _options?: { params?: HttpParams }) => of(
        endpoint === '/events/search'
          ? { content: [], nextCursor: null, previousCursor: null }
          : {
              id: 9,
              title: 'Evento de teste',
              slug: 'evento-de-teste',
              summary: 'Resumo do evento',
              format: 'ONLINE',
              category: 'ACADEMIC_EDUCATIONAL',
              startDate: '2026-08-22T10:00:00',
              endDate: '2026-08-22T12:00:00',
            },
      ),
    );
    TestBed.configureTestingModule({
      providers: [EventsService, { provide: ApiService, useValue: api }],
    });
    service = TestBed.inject(EventsService);
  });

  it('should search with the API snake_case filter and cursor pagination', () => {
    service.search({ format: 'ONLINE', event_category: 'ACADEMIC_EDUCATIONAL' }, 'cursor-2', 20).subscribe();

    expect(api.post).toHaveBeenCalledWith(
      '/events/search',
      { format: 'ONLINE', event_category: 'ACADEMIC_EDUCATIONAL' },
      { params: expect.objectContaining({}) },
    );
    const params = api.post.mock.calls[0]?.[2]?.params;
    expect(params?.get('nextCursor')).toBe('cursor-2');
    expect(params?.get('pageSize')).toBe('20');
  });

  it('should use the available event and user endpoints', () => {
    service.getById(12).subscribe();
    service.getBySlug('semana-da-computacao').subscribe();
    service.getCreatedEvents().subscribe();
    service.getSubscriptions().subscribe();

    expect(api.get).toHaveBeenCalledWith('/events/12');
    expect(api.get).toHaveBeenCalledWith('/events/slug/semana-da-computacao');
    expect(api.get).toHaveBeenCalledWith('/users/me/created-events');
    expect(api.get).toHaveBeenCalledWith('/users/me/events-subscriptions');
  });

  it('should create and update events with the current API contracts', () => {
    service.create({
      title: 'Semana da Computação',
      category: 'ACADEMIC_EDUCATIONAL',
      format: 'IN_PERSON',
      start_date: '2026-09-10T08:00',
      end_date: '2026-09-10T18:00',
    }).subscribe();
    service.update(12, {
      title: 'Semana da Computação',
      summary: 'Palestras e oficinas para a comunidade.',
      content: 'Uma programação completa com atividades para estudantes.',
      cover_image_url: 'https://example.com/capa.jpg',
      category: 'ACADEMIC_EDUCATIONAL',
      format: 'IN_PERSON',
      start_date: '2026-09-10T08:00',
      end_date: '2026-09-10T18:00',
    }).subscribe();

    expect(api.post).toHaveBeenCalledWith('/events', {
      title: 'Semana da Computação',
      category: 'ACADEMIC_EDUCATIONAL',
      format: 'IN_PERSON',
      start_date: '2026-09-10T08:00',
      end_date: '2026-09-10T18:00',
    });
    expect(api.patch).toHaveBeenCalledWith('/events/12', {
      title: 'Semana da Computação',
      summary: 'Palestras e oficinas para a comunidade.',
      content: 'Uma programação completa com atividades para estudantes.',
      cover_image_url: 'https://example.com/capa.jpg',
      category: 'ACADEMIC_EDUCATIONAL',
      format: 'IN_PERSON',
      start_date: '2026-09-10T08:00',
      end_date: '2026-09-10T18:00',
    });
  });

  it('should normalize the camelCase event contract returned by the API', () => {
    api.post.mockImplementationOnce(() => of({
      content: [{
        id: 4,
        title: 'Semana de Computação',
        slug: 'semana-de-computacao',
        summary: 'Palestras e oficinas.',
        format: 'IN_PERSON',
        category: 'ACADEMIC_EDUCATIONAL',
        startDate: '2026-09-10T08:00:00',
        endDate: '2026-09-10T18:00:00',
      }],
      nextCursor: 'next-page',
      previousCursor: null,
    } as never));

    service.search().subscribe((page) => {
      expect(page.content[0]).toMatchObject({
        description: 'Palestras e oficinas.',
        start_date: '2026-09-10T08:00:00',
        end_date: '2026-09-10T18:00:00',
      });
      expect(page.next_cursor).toBe('next-page');
    });
  });

  it('should use e-mail addresses for editor management and supported activities', () => {
    service.deleteEvent(12).subscribe();
    service.addEditor(12, 'moderator@ifma.edu.br').subscribe();
    service.removeEditor(12, 'moderator@ifma.edu.br').subscribe();
    service.createActivity(12, { title: 'Palestra' }).subscribe();
    service.deleteActivity(7).subscribe();

    expect(api.delete).toHaveBeenCalledWith('/events/12');
    expect(api.post).toHaveBeenCalledWith('/events/12/editors/moderator%40ifma.edu.br', null);
    expect(api.delete).toHaveBeenCalledWith('/events/12/editors/moderator%40ifma.edu.br');
    expect(api.post).toHaveBeenCalledWith('/events/12/activities', { title: 'Palestra' });
    expect(api.delete).toHaveBeenCalledWith('/events/activities/7');
  });
});
