import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { CONTENT_MANAGEMENT_ROLES } from '../auth/config/auth.config';
import { AuthService } from '../auth/services/auth.service';
import { ProximosEventosComponent } from './components/proximos-eventos/proximos-eventos.component';
import {
  EventCategory,
  EventFormat,
  EventListItem,
  EventsFilter,
  eventCategoryLabel,
  eventFormatLabel,
} from './models/event.model';
import { EventsService } from './services/events.service';

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

  readonly events = signal<EventListItem[]>([]);
  readonly myEvents = signal<EventListItem[]>([]);
  readonly selectedCategory = signal<EventCategory | null>(null);
  readonly selectedFormat = signal<EventFormat | null>(null);
  readonly nextCursor = signal<string | null>(null);
  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly myEventsNextCursor = signal<string | null>(null);
  readonly myEventsLoading = signal(false);
  readonly myEventsLoadingMore = signal(false);
  readonly myEventsError = signal<string | null>(null);
  readonly editorEvents = signal<EventListItem[]>([]);
  readonly editorEventsNextCursor = signal<string | null>(null);
  readonly editorEventsLoading = signal(false);
  readonly editorEventsLoadingMore = signal(false);
  readonly editorEventsError = signal<string | null>(null);
  readonly isAuthenticated = this.authService.isAuthenticatedState;
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
    this.loadMyEvents();
    this.loadEditorEvents();
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

  loadMoreMyEvents(): void {
    const cursor = this.myEventsNextCursor();
    if (!cursor || this.myEventsLoadingMore()) return;

    this.myEventsLoadingMore.set(true);
    this.eventsService.getCreatedEvents(cursor).pipe(
      finalize(() => this.myEventsLoadingMore.set(false)),
    ).subscribe({
      next: (page) => {
        const byId = new Map(this.myEvents().map((event) => [event.id, event]));
        page.content.forEach((event) => byId.set(event.id, event));
        this.myEvents.set([...byId.values()]);
        this.myEventsNextCursor.set(page.next_cursor);
      },
      error: () => this.myEventsError.set('Não foi possível carregar mais eventos criados por você.'),
    });
  }

  loadMoreEditorEvents(): void {
    const cursor = this.editorEventsNextCursor();
    if (!cursor || this.editorEventsLoadingMore()) return;

    this.editorEventsLoadingMore.set(true);
    this.eventsService.getEditableEvents(cursor).pipe(
      finalize(() => this.editorEventsLoadingMore.set(false)),
    ).subscribe({
      next: (page) => {
        const byId = new Map(this.editorEvents().map((event) => [event.id, event]));
        page.content.forEach((event) => byId.set(event.id, event));
        this.editorEvents.set([...byId.values()]);
        this.editorEventsNextCursor.set(page.next_cursor);
      },
      error: () => this.editorEventsError.set('Não foi possível carregar mais eventos disponíveis para edição.'),
    });
  }

  private loadMyEvents(): void {
    if (!this.canManageEvents()) return;

    this.myEventsLoading.set(true);
    this.myEventsError.set(null);
    this.eventsService.getCreatedEvents().pipe(
      finalize(() => this.myEventsLoading.set(false)),
    ).subscribe({
      next: (page) => {
        this.myEvents.set(page.content);
        this.myEventsNextCursor.set(page.next_cursor);
      },
      error: () => this.myEventsError.set('Não foi possível carregar os eventos criados por você.'),
    });
  }

  private loadEditorEvents(): void {
    if (!this.isAuthenticated()) return;

    this.editorEventsLoading.set(true);
    this.editorEventsError.set(null);
    this.eventsService.getEditableEvents().pipe(
      finalize(() => this.editorEventsLoading.set(false)),
    ).subscribe({
      next: (page) => {
        this.editorEvents.set(page.content);
        this.editorEventsNextCursor.set(page.next_cursor);
      },
      error: () => this.editorEventsError.set('Não foi possível carregar seus eventos como editor.'),
    });
  }

  private buildFilter(): EventsFilter {
    const eventCategory = this.selectedCategory();
    const format = this.selectedFormat();

    return {
      ...(eventCategory ? { category: eventCategory } : {}),
      ...(format ? { format } : {}),
    };
  }

}
