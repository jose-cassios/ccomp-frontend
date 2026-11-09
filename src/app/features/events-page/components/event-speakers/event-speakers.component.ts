import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, ElementRef, Input, OnChanges, SimpleChanges, ViewChild, computed, inject, signal } from '@angular/core';
import { Subscription, catchError, finalize, forkJoin, from, map, mergeMap, of, toArray } from 'rxjs';
import { EventActivity, eventActivityTypeLabel } from '../../models/event.model';
import { ActivityInstructorsService, Instructor } from '../../services/activity-instructors.service';
import { EventGuest, EventGuestsService } from '../../services/event-guests.service';
import { EventCoverDirective } from '../event-cover.directive';

interface Speaker {
  key: string; name: string; description: string; image?: string; label: string;
  guestIds: number[]; activityIds: number[];
}

@Component({
  selector: 'app-event-speakers', standalone: true, imports: [DatePipe, EventCoverDirective],
  templateUrl: './event-speakers.component.html', styleUrl: './event-speakers.component.css',
})
export class EventSpeakersComponent implements OnChanges {
  @Input({ required: true }) eventId!: number;
  @Input() activities: EventActivity[] = [];
  @Input() timeZone = '';
  @ViewChild('profileDialog', { static: true }) dialog!: ElementRef<HTMLDialogElement>;
  private readonly guestsApi = inject(EventGuestsService);
  private readonly instructorsApi = inject(ActivityInstructorsService);
  private readonly guests = signal<EventGuest[]>([]);
  private readonly instructors = signal<Instructor[]>([]);
  private request?: Subscription;
  private activityRequest?: Subscription;
  private opener?: HTMLElement;
  readonly loading = signal(false);
  readonly error = signal('');
  readonly selected = signal<Speaker | null>(null);
  readonly directoryOpen = signal(false);
  readonly visibleSpeakers = computed(() => this.speakers().slice(0, 4));
  readonly remainingCount = computed(() => Math.max(0, this.speakers().length - 4));
  readonly profileActivities = signal<EventActivity[]>([]);
  readonly activitiesLoading = signal(false);
  readonly activityType = eventActivityTypeLabel;
  readonly speakers = computed(() => {
    const people = new Map<string, Speaker>();
    for (const guest of this.guests()) {
      // This is the public presentation, including when viewed by an administrator.
      if (guest.status !== 'CONFIRMED' || guest.visibility !== 'PUBLIC') continue;
      const key = guest.user_id ? 'user:' + guest.user_id : 'guest:' + guest.id;
      const current = people.get(key);
      if (current) { current.guestIds.push(guest.id); continue; }
      people.set(key, { key, name: guest.name || 'Convidado', description: guest.description || '',
        image: guest.image_url, label: 'Convidado(a)', guestIds: [guest.id], activityIds: [] });
    }
    for (const instructor of this.instructors()) {
      if (instructor.is_guest || instructor.status !== 'CONFIRMED') continue;
      // Without a common account/profile ID, identical names are not proof of identity.
      const key = instructor.user_id ? 'user:' + instructor.user_id : 'instructor:' + instructor.id;
      let person = people.get(key);
      if (!person) {
        person = { key, name: instructor.name || 'Ministrante', description: instructor.description || '',
          label: instructor.role === 'ASSISTANT' ? 'Auxiliar' : 'Ministrante', guestIds: [], activityIds: [] };
        people.set(key, person);
      } else {
        person.description ||= instructor.description || '';
        if (instructor.role !== 'ASSISTANT') person.label = 'Ministrante';
      }
      if (!person.activityIds.includes(instructor.activity_id)) person.activityIds.push(instructor.activity_id);
    }
    return [...people.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => { this.request?.unsubscribe(); this.activityRequest?.unsubscribe(); });
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['eventId']) { this.close(); this.load(); }
    else if (changes['activities'] && this.selected()) this.loadActivities();
  }
  load(): void {
    this.request?.unsubscribe(); this.loading.set(true); this.error.set('');
    this.guests.set([]); this.instructors.set([]);
    const recover = (error: unknown) => {
      if (!(error instanceof HttpErrorResponse && [401, 403].includes(error.status))) {
        this.error.set('Alguns perfis não puderam ser carregados.');
      }
      return of([]);
    };
    // No login/enrollment gate: public guest routes work today; instructor access is enforced by the API.
    this.request = forkJoin({ guests: this.guestsApi.allGuests(this.eventId).pipe(catchError(recover)),
      instructors: this.instructorsApi.forEvent(this.eventId).pipe(catchError(recover)),
    }).pipe(finalize(() => this.loading.set(false))).subscribe(result => {
      this.guests.set(result.guests); this.instructors.set(result.instructors);
    });
  }
  initials(name: string): string { return name.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase(); }
  open(person: Speaker, trigger: HTMLElement): void {
    if (!this.dialog.nativeElement.open) this.opener = trigger;
    this.selected.set(person); this.loadActivities();
    if (!this.dialog.nativeElement.open) this.dialog.nativeElement.showModal();
    else this.dialog.nativeElement.focus();
  }
  showDirectory(trigger?: HTMLElement): void {
    this.activityRequest?.unsubscribe(); this.selected.set(null); this.directoryOpen.set(true);
    if (!this.dialog.nativeElement.open) {
      this.opener = trigger; this.dialog.nativeElement.showModal();
    } else this.dialog.nativeElement.focus();
  }
  close(): void {
    this.activityRequest?.unsubscribe(); this.selected.set(null); this.directoryOpen.set(false);
    if (this.dialog?.nativeElement.open) this.dialog.nativeElement.close(); this.opener?.focus(); this.opener = undefined;
  }
  backdrop(event: MouseEvent): void { if (event.target === this.dialog.nativeElement) this.close(); }
  loadActivities(): void {
    this.activityRequest?.unsubscribe();
    const person = this.selected(); if (!person) return;
    const known = this.activities.filter(activity => person.activityIds.includes(activity.id)).sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''));
    this.profileActivities.set(known);
    if (!person.guestIds.length || !this.activities.length) return;
    this.activitiesLoading.set(true);
    this.activityRequest = from(this.activities).pipe(
      mergeMap(activity => this.guestsApi.allGuests(this.eventId, activity.id).pipe(
        map(guests => guests.some(guest => person.guestIds.includes(guest.event_guest_id ?? guest.id)
          && guest.status === 'CONFIRMED' && guest.visibility === 'PUBLIC') ? activity : null),
        catchError(() => of(null)),
      ), 4), toArray(), finalize(() => this.activitiesLoading.set(false)),
    ).subscribe(found => {
      const byId = new Map(known.map(activity => [activity.id, activity]));
      for (const activity of found) if (activity) byId.set(activity.id, activity);
      this.profileActivities.set([...byId.values()].sort((a, b) => (a.start_date || '').localeCompare(b.start_date || '')));
    });
  }
}
