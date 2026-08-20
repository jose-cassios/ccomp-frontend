import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { CONTENT_MANAGEMENT_ROLES } from '../auth/config/auth.config';
import { AuthService } from '../auth/services/auth.service';
import { EventoDestaqueComponent } from './components/evento-destaque/evento-destaque.component';
import { ProximosEventosComponent } from './components/proximos-eventos/proximos-eventos.component';
import {
  EventCategory,
  EventFormat,
  EventListItem,
  EventResponse,
  EventsFilter,
  EventTiming,
  eventCategoryLabel,
  eventFormatLabel,
} from './models/event.model';
import { EventsService } from './services/events.service';

@Component({
  selector: 'app-events-page',
  standalone: true,
  imports: [DatePipe, RouterLink, EventoDestaqueComponent, ProximosEventosComponent],
  templateUrl: './events-page.component.html',
  styleUrl: './events-page.component.css',
})
export class EventsPageComponent implements OnInit {
  private readonly eventsService = inject(EventsService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly events = signal<EventListItem[]>([]);
  readonly createdEvents = signal<EventResponse[]>([]);
  readonly selectedCategory = signal<EventCategory | null>(null);
  readonly selectedFormat = signal<EventFormat | null>(null);
  readonly selectedTiming = signal<EventTiming | null>(null);
  readonly nextCursor = signal<string | null>(null);
  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly createdEventsLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly createdEventsError = signal<string | null>(null);
  readonly calendarOpen = signal(false);
  readonly calendarEvents = signal<EventListItem[]>([]);
  readonly calendarLoading = signal(false);
  readonly calendarError = signal<string | null>(null);
  readonly canManageEvents = computed(() =>
    this.authService.hasAnyRole(CONTENT_MANAGEMENT_ROLES),
  );
  readonly featuredEvent = computed(() => this.events()[0] ?? null);
  readonly remainingEvents = computed(() => {
    const featuredId = this.featuredEvent()?.id;
    return this.events().filter((event) => event.id !== featuredId);
  });
  readonly categoryLabel = eventCategoryLabel;
  readonly formatLabel = eventFormatLabel;

  ngOnInit(): void {
    this.reload();
    if (this.canManageEvents()) this.loadCreatedEvents();
  }

  reload(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.eventsService.search(this.buildFilter()).pipe(
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: (page) => {
        this.events.set(this.applyTimingFilter(page.content));
        this.nextCursor.set(page.next_cursor);
      },
      error: () => {
        this.events.set([]);
        this.errorMessage.set('Não foi possível carregar os eventos. Tente novamente em instantes.');
      },
    });
  }

  loadMore(): void {
    const cursor = this.nextCursor();
    if (!cursor || this.loadingMore()) return;

    this.loadingMore.set(true);
    this.eventsService.search(this.buildFilter(), cursor).pipe(
      finalize(() => this.loadingMore.set(false)),
    ).subscribe({
      next: (page) => {
        const byId = new Map(this.events().map((event) => [event.id, event]));
        this.applyTimingFilter(page.content).forEach((event) => byId.set(event.id, event));
        this.events.set([...byId.values()]);
        this.nextCursor.set(page.next_cursor);
      },
      error: () => this.errorMessage.set('Não foi possível carregar mais eventos.'),
    });
  }

  changeCategory(category: EventCategory | null): void {
    this.selectedCategory.set(category);
    this.reload();
  }

  changeFormat(format: EventFormat | null): void {
    this.selectedFormat.set(format);
    this.reload();
  }

  changeTiming(timing: EventTiming | null): void {
    this.selectedTiming.set(timing);
    this.reload();
  }

  openCalendar(): void {
    this.calendarOpen.set(true);
    if (this.calendarEvents().length || this.calendarLoading()) return;

    this.calendarLoading.set(true);
    this.calendarError.set(null);
    this.eventsService.search({}, undefined, 50).pipe(
      finalize(() => this.calendarLoading.set(false)),
    ).subscribe({
      next: (page) => this.calendarEvents.set(page.content),
      error: () => this.calendarError.set('Não foi possível carregar o calendário de eventos.'),
    });
  }

  closeCalendar(): void {
    this.calendarOpen.set(false);
  }

  openEvent(id: number): void {
    void this.router.navigate(['/eventos', id]);
  }

  private loadCreatedEvents(): void {
    this.createdEventsLoading.set(true);
    this.createdEventsError.set(null);
    this.eventsService.getCreatedEvents().pipe(
      finalize(() => this.createdEventsLoading.set(false)),
    ).subscribe({
      next: (events) => this.createdEvents.set(events),
      error: () => this.createdEventsError.set('Não foi possível carregar os eventos que você criou.'),
    });
  }

  private buildFilter(): EventsFilter {
    const eventCategory = this.selectedCategory();
    const format = this.selectedFormat();

    return {
      ...(eventCategory ? { event_category: eventCategory } : {}),
      ...(format ? { format } : {}),
    };
  }

  private applyTimingFilter(events: EventListItem[]): EventListItem[] {
    const timing = this.selectedTiming();
    if (!timing) return events;

    const now = Date.now();
    return events.filter((event) => {
      const start = event.start_date ? new Date(event.start_date).getTime() : Number.NaN;
      const end = event.end_date ? new Date(event.end_date).getTime() : Number.NaN;
      if (timing === 'IN_PROGRESS') return start <= now && end >= now;
      return start > now;
    });
  }
}
