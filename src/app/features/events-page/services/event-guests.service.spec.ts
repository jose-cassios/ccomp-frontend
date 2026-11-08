import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiConfig } from '../../../core/api/api.config';
import { EventGuestsService } from './event-guests.service';

describe('Guest API contract', () => {
  let service: EventGuestsService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(),
      { provide: ApiConfig, useValue: { buildUrl: (path: string) => '/api' + path } },
    ] });
    service = TestBed.inject(EventGuestsService); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('links an active account to an activity and deletes a whole guest profile', () => {
    service.linkAccount(1, 7, ' person@ifma.edu.br ', 3).subscribe();
    const account = http.expectOne('/api/events/1/guests/7/account');
    expect(account.request.method).toBe('PATCH');
    expect(account.request.body).toEqual({ email: 'person@ifma.edu.br', activity_id: 3 });
    account.flush({});
    service.remove(1, 7).subscribe();
    const remove = http.expectOne('/api/events/1/guests/7');
    expect(remove.request.method).toBe('DELETE'); remove.flush(null);
  });
  it('reads all cursor pages to distinguish existing profiles before registration', () => {
    let ids: number[] = [];
    service.allGuests(1).subscribe(rows => ids = rows.map(row => row.id));
    http.expectOne(r => r.url === '/api/events/1/guests' && !r.params.has('cursor'))
      .flush({ content: [{ id: 7, name: 'Existing' }], next_cursor: 'page2' });
    http.expectOne(r => r.url === '/api/events/1/guests' && r.params.get('cursor') === 'page2')
      .flush({ content: [{ id: 8, name: 'Another' }], next_cursor: null });
    expect(ids).toEqual([7, 8]);
  });
  it('normalizes flat activity guests using the event guest ID for images', () => {
    service.guests(1, undefined, 3).subscribe(page => {
      expect(page.content[0].id).toBe(99);
      expect(page.content[0].event_guest_id).toBe(7);
      expect(page.content[0].image_url).toBe('/api/events/1/guests/7/image');
      expect(page.next_cursor).toBe('next');
    });
    const req = http.expectOne(r => r.url === '/api/events/activities/3/guests');
    expect(req.request.method).toBe('GET');
    req.flush({ content: [{ id: 99, event_guest_id: 7, name: 'Guest', image_key: 'stored-key', role: 'PRESENTER' }], next_cursor: 'next' });
  });
  it('creates profiles, associates activities and sends the photo as multipart file', () => {
    service.create(1, { name: 'Guest', description: 'Speaker' }).subscribe();
    const create = http.expectOne('/api/events/1/guests');
    expect(create.request.method).toBe('POST'); expect(create.request.body).toEqual({ name: 'Guest', description: 'Speaker' });
    create.flush({ message: 'Created' });
    service.associate(1, 7, 3, 'SPECIAL_GUEST').subscribe();
    const link = http.expectOne('/api/events/1/guests/7/activities/3');
    expect(link.request.body).toEqual({ role: 'SPECIAL_GUEST' }); link.flush(null);
    const file = new File(['image'], 'guest.png', { type: 'image/png' });
    service.uploadImage(1, 7, file).subscribe();
    const upload = http.expectOne('/api/events/1/guests/7/image');
    expect(upload.request.body.get('file')).toBe(file); expect(upload.request.method).toBe('POST');
    upload.flush({ message: 'Uploaded' });
  });
  it('edits the profile and removes the photo without deleting the guest', () => {
    service.profile(1, 7, { name: 'Updated', description: '' }).subscribe();
    const edit = http.expectOne('/api/events/1/guests/7/profile'); expect(edit.request.method).toBe('PATCH'); edit.flush({});
    service.removeImage(1, 7).subscribe();
    const remove = http.expectOne('/api/events/1/guests/7/image'); expect(remove.request.method).toBe('DELETE'); remove.flush(null);
  });
});
