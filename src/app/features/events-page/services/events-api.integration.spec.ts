import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EventsService } from './events.service';
import { EventGuestsService } from './event-guests.service';
import { EventActivity } from '../models/event.model';

describe('Updated events API contracts', () => {
  let http: HttpTestingController;
  let events: EventsService;
  let guests: EventGuestsService;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    events = TestBed.inject(EventsService);
    guests = TestBed.inject(EventGuestsService);
  });
  afterEach(() => http.verify());

  it('uploads and removes covers through the event-specific multipart endpoint', () => {
    const file = new File(['png'], 'cover.png', { type: 'image/png' });
    events.uploadCover(7, file).subscribe();
    const upload = http.expectOne(r => r.url.endsWith('/events/7/images/cover'));
    expect(upload.request.method).toBe('POST');
    expect(upload.request.body.get('file')).toBe(file);
    upload.flush({ response: 'Imagem atualizada' });
    events.removeCover(7).subscribe();
    const removal = http.expectOne(r => r.url.endsWith('/events/7/images/cover'));
    expect(removal.request.method).toBe('DELETE');
    removal.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('maps storage keys from details and legacy list fields to the image proxy', () => {
    events.getById(7).subscribe(event => expect(event.cover_image_url).toBe(events.coverUrl(7)));
    http.expectOne(r => r.url.endsWith('/events/7')).flush({ id: 7, coverImageKey: 'events/7/cover/image.png' });
    events.search().subscribe(page => expect(page.content[0].cover_image_url).toBe(events.coverUrl(7)));
    http.expectOne(r => r.url.endsWith('/events/search')).flush({ content: [{ id: 7, coverImageUrl: 'events/7/cover/image.png' }] });
  });

  it('cancels activity registration at unsubscribe, independently of event registration', () => {
    events.unsubscribeActivity(7).subscribe();
    const request = http.expectOne(r => r.url.endsWith('/events/activities/7/unsubscribe'));
    expect(request.request.method).toBe('DELETE');
    request.flush({ response: 'Cancelada' });
  });

  it('collects every subscription page and normalizes dates', () => {
    let result: EventActivity[] = [];
    events.getMyActivitySubscriptions(7).subscribe(items => result = items);
    http.expectOne(r => r.url.endsWith('/events/7/activities/my-subscriptions') && !r.params.has('cursor'))
      .flush({ content: [{id: 1, eventId: 7, startDate: '2026-09-20T10:00:00'}], nextCursor: 'next' });
    http.expectOne(r => r.params.get('cursor') === 'next')
      .flush({ content: [{id: 2, event_id: 7, start_date: '2026-09-20T11:00:00'}], next_cursor: null });
    expect(result.map(a => a.id)).toEqual([1, 2]);
    expect(result[0].start_date).toBe('2026-09-20T10:00:00');
  });

  it('uses the conflict and activity enrollment routes with cursor, not nextCursor', () => {
    events.getActivityConflicts(3).subscribe();
    http.expectOne(r => r.url.endsWith('/events/activities/3/conflicts')).flush({content: [], next_cursor: null});
    events.getActivityEnrollments(3, 'page2').subscribe(page => {
      expect(page.content[0].user?.email_address).toBe('a@example.com');
      expect(page.content[0].status).toBe('CONFIRMED');
    });
    const request = http.expectOne(r => r.url.endsWith('/events/activities/3/enrollments'));
    expect(request.request.params.get('cursor')).toBe('page2');
    expect(request.request.params.has('nextCursor')).toBe(false);
    request.flush({content: [{id: 1, user: {id: 'u', name: 'Ana', emailAddress: {value: 'a@example.com'}}}]});
  });

  it('posts invitations using email and replies using the accept query parameter', () => {
    guests.invite(7, ' a@example.com ').subscribe();
    const invite = http.expectOne(r => r.url.endsWith('/events/7/invitations'));
    expect(invite.request.method).toBe('POST');
    expect(invite.request.body).toEqual({ email: 'a@example.com' });
    invite.flush({response: 'Registrado'});
    guests.reply('code', false).subscribe();
    const reply = http.expectOne(r => r.url.endsWith('/events/invitations/code/reply'));
    expect(reply.request.method).toBe('POST');
    expect(reply.request.params.get('accept')).toBe('false');
    expect(reply.request.body).toBeNull();
    reply.flush({response: 'Recusado'});
  });

  it('normalizes invitation email value objects and nested activity guests', () => {
    guests.invitations(7, 'a@example.com', 'cursor').subscribe(page => expect(page.content[0].email).toBe('a@example.com'));
    const request = http.expectOne(r => r.url.endsWith('/events/7/invitations'));
    expect(request.request.params.get('email')).toBe('a@example.com');
    expect(request.request.params.get('cursor')).toBe('cursor');
    request.flush({content: [{id: 1, code: 'c', email_address: {value: 'a@example.com'}, status: 'PENDING'}]});
    guests.guests(7, undefined, 3).subscribe(page => expect(page.content[0].user_id).toBe('u'));
    http.expectOne(r => r.url.endsWith('/events/activities/3/guests')).flush({content: [{id: 2, event_guest: {id: 1, user_id: 'u', status: 'CONFIRMED', visibility: 'PUBLIC'}}]});
  });

  it('updates guest preferences and cancels invitations using their own ids', () => {
    guests.update(7, 4, {visibility: 'PRIVATE'}).subscribe();
    const update = http.expectOne(r => r.url.endsWith('/events/7/guests/4'));
    expect(update.request.method).toBe('PATCH');
    expect(update.request.body).toEqual({visibility: 'PRIVATE'});
    update.flush({});
    guests.cancel(8).subscribe();
    const cancel = http.expectOne(r => r.url.endsWith('/events/invitations/8'));
    expect(cancel.request.method).toBe('DELETE'); cancel.flush({});
  });
});
