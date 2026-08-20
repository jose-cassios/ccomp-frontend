import { Component, computed, inject, OnInit, signal } from '@angular/core';
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
  private readonly newsService = inject(NewsService);
  private readonly eventsService = inject(EventsService);
  private readonly authService = inject(AuthService);
  private readonly heroHighlightsService = inject(HeroHighlightsService);

  readonly newsItems = signal<NewsItemType[]>([]);
  readonly events = signal<EventListItem[]>([]);
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
    this.eventsService.search({}, undefined, 12).subscribe({
      next: (response) => this.events.set(response.content),
      error: () => this.events.set([]),
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
