import { HttpParams } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { EventsService } from './events.service';

describe('EventsService', () => {
  const api = {
    get: vi.fn((_endpoint: string) => of({})),
    post: vi.fn(
      (_endpoint: string, _body: unknown, _options?: { params?: HttpParams }) => of({}),
    ),
    patch: vi.fn((_endpoint: string, _body: unknown) => of({})),
    delete: vi.fn((_endpoint: string) => of({})),
  };
  let service: EventsService;

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [EventsService, { provide: ApiService, useValue: api }],
    });
    service = TestBed.inject(EventsService);
  });

  it('should search with the Swagger filter and cursor pagination', () => {
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
