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

  it('should search with filters and cursor pagination', () => {
    service.search({ format: 'ONLINE', timing: 'FUTURE' }, 'cursor-2', 20).subscribe();

    expect(api.post).toHaveBeenCalledWith(
      '/events/search',
      { format: 'ONLINE', timing: 'FUTURE' },
      { params: expect.objectContaining({}) },
    );
    const params = api.post.mock.calls[0]?.[2]?.params;
    expect(params?.get('nextCursor')).toBe('cursor-2');
    expect(params?.get('pageSize')).toBe('20');
  });

  it('should load event discovery and management endpoints', () => {
    service.getFeatured().subscribe();
    service.getById(12).subscribe();
    service.getEditableEvents().subscribe();

    expect(api.get).toHaveBeenCalledWith('/events/featured');
    expect(api.get).toHaveBeenCalledWith('/events/12');
    expect(api.get).toHaveBeenCalledWith('/users/me/editable-events');
  });

  it('should call event and activity mutation endpoints', () => {
    service.deleteEvent(12).subscribe();
    service.addEditor(12, 'moderator-id').subscribe();
    service.updateActivity(7, { title: 'Palestra' }).subscribe();
    service.deleteActivity(7).subscribe();

    expect(api.delete).toHaveBeenCalledWith('/events/12');
    expect(api.post).toHaveBeenCalledWith('/events/12/editors/moderator-id', null);
    expect(api.patch).toHaveBeenCalledWith('/events/activities/7', { title: 'Palestra' });
    expect(api.delete).toHaveBeenCalledWith('/events/activities/7');
  });
});
