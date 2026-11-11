import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EventsService } from './events.service';
import { ApiConfig } from '../../../core/api/api.config';

describe('Event and activity capacity API contracts', () => {
  let service: EventsService; let http: HttpTestingController;
  const event = { id: 9, title: 'Evento', format: 'IN_PERSON', category: 'ACADEMIC_EDUCATIONAL' };
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), { provide: ApiConfig, useValue: { buildUrl: (p: string) => '/api' + p } }] });
    service = TestBed.inject(EventsService); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('reads public activity capacity without requesting private enrollments', () => {
    service.getActivityCapacity(3).subscribe(value => expect(value).toEqual({ current_enrollments: 12, max_capacity: 20 }));
    const req = http.expectOne('/api/events/activities/3/enrollments/summary');
    expect(req.request.method).toBe('GET'); req.flush({ current_enrollments: 12, max_capacity: 20 });
    service.getActivityCapacity(4).subscribe(value => expect(value).toEqual({ current_enrollments: 0, max_capacity: null }));
    http.expectOne('/api/events/activities/4/enrollments/summary').flush({ currentEnrollments: 0, maxCapacity: null });
  });
  it('maps activity attendance and respects the enrollment cursor', () => {
    service.getActivityEnrollments(3, 'next').subscribe(page => {
      expect(page.content[0].status).toBe('CHECKED_IN'); expect(page.next_cursor).toBe('following');
    });
    const req = http.expectOne(r => r.url === '/api/events/activities/3/enrollments' && r.params.get('cursor') === 'next');
    req.flush({ content: [{ id: 5, have_check_in: true, user: { id: 'u', name: 'Ana' } }], next_cursor: 'following' });
  });
  it('sends max_capacity on creation, preserving zero when the old event response omits it', () => {
    service.create({ title: 'Evento', time_zone: 'America/Sao_Paulo', category: 'ACADEMIC_EDUCATIONAL', format: 'IN_PERSON', max_capacity: 0 }).subscribe(value => expect(value.max_capacity).toBe(0));
    const request = http.expectOne('/api/events'); expect(request.request.body.max_capacity).toBe(0); request.flush(event);
  });
  it('uses a separate PUT to change event capacity instead of the unsupported generic PATCH field', () => {
    service.update(9, { title: 'Outro', max_capacity: 20 }).subscribe(value => expect(value.max_capacity).toBe(20));
    const patch = http.expectOne('/api/events/9'); expect(patch.request.body).toEqual({ title: 'Outro' }); patch.flush(event);
    const put = http.expectOne('/api/events/9/capacity'); expect(put.request.method).toBe('PUT'); expect(put.request.body).toEqual({ max_capacity: 20 }); put.flush({ ...event, max_capacity: 20 });
  });
  it('does not accidentally remove capacity when editing unrelated event fields', () => {
    service.update(9, { title: 'Outro' }).subscribe(value => expect(value.max_capacity).toBe(12));
    http.expectOne('/api/events/9').flush({ ...event, maxCapacity: 12 }); http.expectNone('/api/events/9/capacity');
  });
  it('removes the event limit with explicit null', () => {
    service.setEventCapacity(9, null).subscribe(value => expect(value.max_capacity).toBeNull());
    const req = http.expectOne('/api/events/9/capacity'); expect(req.request.body).toEqual({ max_capacity: null }); req.flush({ ...event, max_capacity: null });
  });
  it('creates and updates activity limits, including zero', () => {
    service.createActivity(9, { title: 'Oficina', max_capacity: 15 }).subscribe(value => expect(value.max_capacity).toBe(15));
    const create = http.expectOne('/api/events/9/activities'); expect(create.request.body.max_capacity).toBe(15); create.flush({ id: 3, max_capacity: 15 });
    service.updateActivity(3, { max_capacity: 0 }).subscribe(value => expect(value.capacity).toBe(0));
    const update = http.expectOne('/api/events/activities/3'); expect(update.request.body).toEqual({ max_capacity: 0 }); update.flush({ id: 3, maxCapacity: 0 });
  });
  it('uses PUT for unlimited activities because PATCH null would keep the old limit', () => {
    service.updateActivity(3, { title: 'Oficina', max_capacity: null }).subscribe(value => expect(value.max_capacity).toBeNull());
    const patch = http.expectOne('/api/events/activities/3'); expect(patch.request.body).toEqual({ title: 'Oficina' }); patch.flush({ id: 3, max_capacity: 15 });
    const put = http.expectOne('/api/events/activities/3/capacity'); expect(put.request.body).toEqual({ max_capacity: null }); put.flush({ id: 3, max_capacity: null });
  });
  it('reports the unavailable capacity endpoint instead of reporting a successful save', () => {
    const next = vi.fn(); const error = vi.fn(); service.update(9, { max_capacity: 20 }).subscribe({ next, error });
    http.expectOne('/api/events/9').flush(event);
    http.expectOne('/api/events/9/capacity').flush({}, { status: 404, statusText: 'Not Found' });
    expect(next).not.toHaveBeenCalled(); expect(error.mock.calls[0][0].error.message).toContain('limite não foi alterado');
  });
});
