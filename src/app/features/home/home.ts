import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, expand, finalize, throwError } from 'rxjs';
import { CONTENT_MANAGEMENT_ROLES } from '../auth/config/auth.config';
import { AuthService } from '../auth/services/auth.service';
import { EventListItem } from '../events-page/models/event.model';
import { EventsService } from '../events-page/services/events.service';
import { NewsItemType } from '../news-page/interface/news.interface';
import { NewsService } from '../news-page/services/news.service';
import { AgendaMesComponent } from './components/agenda-mes/agenda-mes.component';
import { BannerComponent } from './components/banner/banner.component';
import { DestaquesSemana } from './components/destaques-semana/destaques-semana';
import { EventosAndamentoComponent } from './components/eventos-andamento/eventos-andamento.component';
import { HeroHighlightEditorComponent } from './components/hero-highlight-editor/hero-highlight-editor.component';
import { NoticiasClubeComponent } from './components/noticias-clube/noticias-clube.component';
import { GlobalHighlight } from './models/global-highlight.model';
import { HeroHighlightsService } from './services/hero-highlights.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    BannerComponent,
    AgendaMesComponent,
    EventosAndamentoComponent,
    DestaquesSemana,
    NoticiasClubeComponent,
    HeroHighlightEditorComponent,
  ],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly newsService = inject(NewsService);
  private readonly eventsService = inject(EventsService);
  private readonly authService = inject(AuthService);
  private readonly heroHighlightsService = inject(HeroHighlightsService);

  readonly newsItems = signal<NewsItemType[]>([]);
  readonly events = signal<EventListItem[]>([]);
  readonly eventsLoading = signal(false);
  readonly eventsError = signal<string | null>(null);
  readonly highlights = signal<GlobalHighlight[]>([]);
  readonly highlightEditorOpen = signal(false);
  readonly canManageHighlights = computed(() =>
    this.authService.hasAnyRole(CONTENT_MANAGEMENT_ROLES),
  );
  readonly clubHighlights = computed(() =>
    this.highlights().filter((highlight) => highlight.source_type === 'CLUB'),
  );
  readonly ongoingEvents = computed(() => {
    const now = Date.now();
    return this.events().filter((event) => {
      const start = event.start_date ? new Date(event.start_date).getTime() : Number.POSITIVE_INFINITY;
      const end = event.end_date ? new Date(event.end_date).getTime() : Number.NEGATIVE_INFINITY;
      return start <= now && end >= now;
    });
  });

  ngOnInit(): void {
    this.loadFeaturedNews();
    this.loadEvents();
    this.loadHighlights();
  }

  loadFeaturedNews(): void {
    this.newsService.getAll({ featured: true }).subscribe({
      next: (response) => this.newsItems.set(response.content),
      error: () => this.newsItems.set([]),
    });
  }

  loadEvents(): void {
    if (this.eventsLoading()) return;
    this.eventsLoading.set(true);
    this.eventsError.set(null);
    const loaded = new Map<number, EventListItem>();
    const cursors = new Set<string>();
    this.eventsService.search({}, undefined, 50).pipe(
      expand(response => {
        const cursor = response.next_cursor;
        if (!cursor) return EMPTY;
        if (cursors.has(cursor)) return throwError(() => new Error('Repeated events cursor'));
        cursors.add(cursor);
        return this.eventsService.search({}, cursor, 50);
      }, 1),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.eventsLoading.set(false)),
    ).subscribe({
      next: response => {
        response.content.forEach(event => loaded.set(event.id, event));
        this.events.set([...loaded.values()]);
      },
      error: () => this.eventsError.set('Não foi possível carregar toda a agenda. Tente novamente.'),
    });
  }

  openHighlightEditor(): void {
    if (this.canManageHighlights()) this.highlightEditorOpen.set(true);
  }

  closeHighlightEditor(): void {
    this.highlightEditorOpen.set(false);
  }

  private loadHighlights(): void {
    this.heroHighlightsService.getAll().subscribe({
      next: (highlights) => this.highlights.set(highlights),
      error: () => this.highlights.set([]),
    });
  }
}
