import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { EventSpeakersComponent } from './event-speakers.component';
import { EventGuestsService, EventGuest } from '../../services/event-guests.service';
import { ActivityInstructorsService } from '../../services/activity-instructors.service';
import { EventActivity } from '../../models/event.model';

describe('Public event speakers', () => {
  const guest: EventGuest = { id: 7, user_id: 'ana', name: 'Ana Silva', description: 'Pesquisadora', status: 'CONFIRMED', visibility: 'PUBLIC', email: 'private@example.com' };
  const activities: EventActivity[] = [
    { id: 2, event_id: 1, title: 'Oficina', description: '', start_date: '2026-11-08T14:00', end_date: '2026-11-08T16:00', location: 'Lab 1', type: 'WORKSHOP' },
    { id: 3, event_id: 1, title: 'Palestra', description: '', start_date: '2026-11-08T09:00', end_date: '2026-11-08T10:00', type: 'LECTURE' },
  ];
  const guests = { allGuests: vi.fn() }; const instructors = { forEvent: vi.fn() };
  beforeEach(() => {
    vi.resetAllMocks();
    guests.allGuests.mockImplementation((_event: number, activity?: number) => of(activity ? [] : [guest]));
    instructors.forEvent.mockReturnValue(of([]));
    TestBed.configureTestingModule({ imports: [EventSpeakersComponent], providers: [
      { provide: EventGuestsService, useValue: guests }, { provide: ActivityInstructorsService, useValue: instructors },
    ] });
  });
  function create() {
    const fixture = TestBed.createComponent(EventSpeakersComponent);
    fixture.componentRef.setInput('eventId', 1); fixture.componentRef.setInput('activities', activities);
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    dialog.showModal = vi.fn(() => dialog.setAttribute('open', '')); dialog.close = vi.fn(() => dialog.removeAttribute('open'));
    return fixture;
  }
  it('renders a single card without authentication, hiding private/canceled profiles and emails', () => {
    guests.allGuests.mockReturnValue(of([guest, { ...guest, id: 8, visibility: 'PRIVATE' }, { ...guest, id: 9, status: 'CANCELED' }]));
    const fixture = create();
    expect(fixture.nativeElement.querySelectorAll('.speakers-card')).toHaveLength(1);
    expect(fixture.nativeElement.querySelectorAll('.person')).toHaveLength(1);
    expect(fixture.nativeElement.textContent).not.toContain(guest.email);
    expect(fixture.componentInstance.initials('Ana Silva')).toBe('AS');
    expect(instructors.forEvent).toHaveBeenCalledWith(1);
  });
  it('merges shared account records and shows description and ordered activities in the dialog', () => {
    instructors.forEvent.mockReturnValue(of([2, 3].map(activity_id => ({ id: activity_id + 10, activity_id, user_id: 'ana', name: 'Ana Silva', status: 'CONFIRMED', is_guest: false }))));
    const fixture = create();
    expect(fixture.componentInstance.speakers()).toHaveLength(1);
    const button = fixture.nativeElement.querySelector('.person') as HTMLButtonElement; button.focus(); button.click(); fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    expect(dialog.open).toBe(true); expect(dialog.textContent).toContain('Pesquisadora');
    expect(fixture.componentInstance.profileActivities().map(a => a.id)).toEqual([3, 2]);
    expect(dialog.textContent).toContain('Lab 1'); expect(dialog.textContent).not.toContain(guest.email);
    dialog.querySelector('footer button')!.dispatchEvent(new MouseEvent('click')); fixture.detectChanges();
    expect(dialog.open).toBe(false); expect(document.activeElement).toBe(button);
  });
  it('finds guest activities using the event guest ID instead of the association ID', () => {
    guests.allGuests.mockImplementation((_event: number, activity?: number) => of(activity === 2 ? [{ ...guest, id: 99, event_guest_id: 7 }] : activity ? [] : [guest]));
    const fixture = create(); fixture.nativeElement.querySelector('.person').click(); fixture.detectChanges();
    expect(fixture.componentInstance.profileActivities().map(a => a.id)).toEqual([2]);
  });
  it('keeps guests visible when the instructor API still requires login', () => {
    instructors.forEvent.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    const fixture = create(); expect(fixture.nativeElement.querySelectorAll('.person')).toHaveLength(1);
    expect(fixture.componentInstance.error()).toBe(''); expect(fixture.componentInstance.loading()).toBe(false);
  });
  it('cancels pending activity lookups when the dialog closes', () => {
    const pending = new Subject<EventGuest[]>();
    guests.allGuests.mockImplementation((_event: number, activity?: number) => activity ? pending : of([guest]));
    const fixture = create(); fixture.nativeElement.querySelector('.person').click();
    expect(fixture.componentInstance.activitiesLoading()).toBe(true);
    fixture.componentInstance.close(); pending.next([{ ...guest, event_guest_id: 7 }]); pending.complete();
    expect(fixture.componentInstance.selected()).toBeNull(); expect(fixture.componentInstance.activitiesLoading()).toBe(false);
    expect(fixture.componentInstance.profileActivities()).toEqual([]);
  });

  it('compacts many people into overlapping avatars and keeps every profile accessible through +N', () => {
    guests.allGuests.mockImplementation((_event: number, activity?: number) => of(activity ? [] : Array.from({ length: 12 }, (_, i) => ({ ...guest, id: i + 1, user_id: 'user-' + i, name: 'Pessoa ' + i }))));
    const fixture = create();
    const card = fixture.nativeElement.querySelector('.speakers-card') as HTMLElement;
    expect(card.querySelectorAll('.person:not(.more-people)')).toHaveLength(4);
    expect(card.textContent).not.toContain('Pessoa');
    expect(card.textContent).not.toContain('Convidado(a)');
    const more = card.querySelector('.more-people') as HTMLButtonElement;
    expect(more.textContent).toContain('+8'); more.focus(); more.click(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.directory-person')).toHaveLength(12);
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    fixture.nativeElement.querySelectorAll('.directory-person')[11].click(); fixture.detectChanges();
    expect(fixture.componentInstance.selected()).not.toBeNull();
    expect(dialog.textContent).toContain('Pesquisadora');
    expect(dialog.showModal).toHaveBeenCalledTimes(1);
    (dialog.querySelector('footer button') as HTMLButtonElement).click(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.directory-person')).toHaveLength(12);
    fixture.componentInstance.close(); fixture.detectChanges();
    expect(document.activeElement).toBe(more);
    expect(fixture.componentInstance.directoryOpen()).toBe(false);
  });

  it('silently omits unavailable activities and keeps successfully loaded ones', () => {
    guests.allGuests.mockImplementation((_event: number, activity?: number) => activity ? throwError(() => new HttpErrorResponse({ status: 403 })) : of([guest]));
    const fixture = create(); fixture.nativeElement.querySelector('.person').click(); fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    expect(dialog.textContent).not.toContain('Atividades no evento');
    expect(dialog.textContent).not.toContain('Tentar novamente');
    expect(dialog.textContent).not.toContain('Não foi possível');
    guests.allGuests.mockImplementation((_event: number, activity?: number) => activity === 2 ? of([{ ...guest, event_guest_id: 7 }]) : throwError(() => new Error('offline')));
    fixture.componentInstance.loadActivities(); fixture.detectChanges();
    expect(dialog.textContent).toContain('Oficina');
    expect(dialog.textContent).not.toContain('Tentar novamente');
  });
});
