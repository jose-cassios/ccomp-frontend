import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { CONTENT_MANAGEMENT_ROLES } from '../auth/config/auth.config';
import { AuthService } from '../auth/services/auth.service';
import { ProximosEventosComponent } from './components/proximos-eventos/proximos-eventos.component';
import {
  EventCategory,
  EventDetails,
  EventFormat,
  EventListItem,
  EventsFilter,
  eventCategoryLabel,
  eventFormatLabel,
} from './models/event.model';
import { EventsService } from './services/events.service';
import { MyEventsStoreService } from './services/my-events-store.service';

@Component({
  selector: 'app-events-page',
  standalone: true,
  imports: [DatePipe, RouterLink, ProximosEventosComponent],
  templateUrl: './events-page.component.html',
  styleUrl: './events-page.component.css',
})
export class EventsPageComponent implements OnInit {
  private readonly eventsService = inject(EventsService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly myEventsStore = inject(MyEventsStoreService);

  readonly events = signal<EventListItem[]>([]);
  readonly myDrafts = signal<EventDetails[]>([]);
  readonly selectedCategory = signal<EventCategory | null>(null);
  readonly selectedFormat = signal<EventFormat | null>(null);
  readonly nextCursor = signal<string | null>(null);
  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly calendarOpen = signal(false);
  readonly calendarEvents = signal<EventListItem[]>([]);
  readonly calendarLoading = signal(false);
  readonly calendarError = signal<string | null>(null);
  readonly canManageEvents = computed(() =>
    this.authService.hasAnyRole(CONTENT_MANAGEMENT_ROLES),
  );
  readonly categoryLabel = eventCategoryLabel;
  readonly formatLabel = eventFormatLabel;

  ngOnInit(): void {
    this.reload();
    this.loadMyDrafts();
  }

  reload(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.eventsService.search(this.buildFilter()).pipe(
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: (page) => {
        this.events.set(page.content);
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
        page.content.forEach((event) => byId.set(event.id, event));
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

  openDraft(id: number): void {
    void this.router.navigate(['/eventos', id, 'editar']);
  }

  private loadMyDrafts(): void {
    const ids = this.myEventsStore.ids();
    if (!ids.length) return;

    forkJoin(ids.map((id) => this.eventsService.getById(id).pipe(
      catchError(() => of(null)),
    ))).subscribe({
      next: (loadedEvents) => {
        const drafts = loadedEvents.filter((event): event is EventDetails => event?.status === 'DRAFT');
        loadedEvents
          .filter((event): event is EventDetails => Boolean(event && event.status !== 'DRAFT'))
          .forEach((event) => this.myEventsStore.forget(event.id));
        this.myDrafts.set(drafts);
      },
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

}
