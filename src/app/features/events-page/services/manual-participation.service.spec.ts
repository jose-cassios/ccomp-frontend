import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EventsService } from './events.service';
import { ApiConfig } from '../../../core/api/api.config';

describe('Manual participation API contracts', () => {
  let service: EventsService; let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(),
      { provide: ApiConfig, useValue: { buildUrl: (path: string) => '/api' + path } }] });
    service = TestBed.inject(EventsService); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('uses the event enrollment ID, distinct singular/plural routes and no QR token', () => {
    service.enrollActivityParticipant(3, 42).subscribe();
    const enrollment = http.expectOne('/api/events/activities/3/enrollments/42');
    expect(enrollment.request.method).toBe('POST'); expect(enrollment.request.body).toBeNull(); enrollment.flush({ message: 'OK' });
    service.markActivityAttendance(3, 42).subscribe();
    const attendance = http.expectOne('/api/events/activity/3/enrollments/42/attendance');
    expect(attendance.request.method).toBe('POST'); expect(attendance.request.body).toBeNull(); attendance.flush({ message: 'OK' });
    service.markEventAttendance(1, 42).subscribe();
    const event = http.expectOne('/api/events/1/enrollments/42/status');
    expect(event.request.method).toBe('PUT'); expect(event.request.body).toEqual({ status: 'CHECKED_IN' }); event.flush({ message: 'OK' });
  });
  it('resolves the event enrollment across pages and stops on the exact account', () => {
    let id = 0; service.findEventEnrollment(1, 'target').subscribe(row => id = row.id);
    http.expectOne(r => r.url === '/api/events/1/enrollments' && !r.params.has('nextCursor'))
      .flush({ content: [{ id: 5, status: 'CONFIRMED', user: { id: 'other', name: 'Same name' } }], next_cursor: 'next' });
    http.expectOne(r => r.params.get('nextCursor') === 'next')
      .flush({ content: [{ id: 42, status: 'CONFIRMED', user: { id: 'target', name: 'Same name' } }], next_cursor: 'unused' });
    expect(id).toBe(42);
  });
  it('rejects inactive registrations rather than marking attendance', () => {
    const error = vi.fn(); service.findEventEnrollment(1, 'target').subscribe({ error });
    http.expectOne(r => r.url === '/api/events/1/enrollments')
      .flush({ content: [{ id: 42, status: 'BANNED', user: { id: 'target' } }], next_cursor: null });
    expect(error).toHaveBeenCalledOnce();
  });
  it('stops a repeated cursor', () => {
    const error = vi.fn(); service.findEventEnrollment(1, 'target').subscribe({ error });
    http.expectOne(r => !r.params.has('nextCursor')).flush({ content: [], next_cursor: 'same' });
    http.expectOne(r => r.params.get('nextCursor') === 'same').flush({ content: [], next_cursor: 'same' });
    expect(error).toHaveBeenCalledOnce();
  });
});
