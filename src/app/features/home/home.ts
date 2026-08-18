import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { BannerComponent } from "./components/banner/banner.component";
import { AgendaMesComponent } from "./components/agenda-mes/agenda-mes.component";
import { EventosAndamentoComponent } from "./components/eventos-andamento/eventos-andamento.component";
import { NoticiasClubeComponent } from "./components/noticias-clube/noticias-clube.component";
import { DestaquesSemana } from "./components/destaques-semana/destaques-semana";
import { NewsService } from '../news-page/services/news.service';
import { NewsItemType } from '../news-page/interface/news.interface';
import { EventListItem } from '../events-page/models/event.model';
import { EventsService } from '../events-page/services/events.service';
import { CONTENT_MANAGEMENT_ROLES } from '../auth/config/auth.config';
import { AuthService } from '../auth/services/auth.service';
import { HeroHighlightEditorComponent } from './components/hero-highlight-editor/hero-highlight-editor.component';
import { GlobalHighlight, HighlightCandidate, HighlightSelection } from './models/global-highlight.model';
import { HeroHighlightsService } from './services/hero-highlights.service';

@Component({
  selector: 'app-home',
  standalone:true,
  imports: [BannerComponent, AgendaMesComponent, EventosAndamentoComponent, DestaquesSemana, NoticiasClubeComponent, HeroHighlightEditorComponent],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  private newsService = inject(NewsService);
  private eventsService = inject(EventsService);
  private authService = inject(AuthService);
  private heroHighlightsService = inject(HeroHighlightsService);
  
  readonly newsItems = signal<NewsItemType[]>([]);
  readonly events = signal<EventListItem[]>([]);
  readonly highlights = signal<GlobalHighlight[]>([]);
  readonly highlightCandidates = signal<HighlightCandidate[]>([]);
  readonly highlightEditorOpen = signal(false);
  readonly highlightCandidatesLoading = signal(false);
  readonly highlightSaving = signal(false);
  readonly highlightError = signal<string | null>(null);
  readonly canManageHighlights = computed(() => this.authService.hasAnyRole(CONTENT_MANAGEMENT_ROLES));
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
      next: (response) => {
        this.newsItems.set(response.content);
      },
      error: (error) => {
        this.newsItems.set([]);
      }
    });
  }

  loadEvents(): void {
    this.eventsService.search({}, undefined, 12).subscribe({
      next: (response) => this.events.set(response.content),
      error: () => this.events.set([]),
    });
  }

  openHighlightEditor(): void {
    if (!this.canManageHighlights()) return;
    this.highlightEditorOpen.set(true);
    this.highlightCandidatesLoading.set(true);
    this.highlightError.set(null);
    this.heroHighlightsService.getCandidates().subscribe({
      next: (candidates) => this.highlightCandidates.set(candidates),
      error: () => {
        this.highlightCandidatesLoading.set(false);
        this.highlightError.set('Não foi possível carregar as entidades disponíveis.');
      },
      complete: () => this.highlightCandidatesLoading.set(false),
    });
  }

  closeHighlightEditor(): void {
    if (!this.highlightSaving()) this.highlightEditorOpen.set(false);
  }

  saveHighlights(selections: HighlightSelection[]): void {
    if (this.highlightSaving()) return;
    this.highlightSaving.set(true);
    this.highlightError.set(null);
    this.heroHighlightsService.update(selections).subscribe({
      next: (highlights) => {
        this.highlights.set(highlights);
        this.highlightEditorOpen.set(false);
      },
      error: () => {
        this.highlightSaving.set(false);
        this.highlightError.set('Não foi possível salvar os destaques.');
      },
      complete: () => this.highlightSaving.set(false),
    });
  }

  private loadHighlights(): void {
    this.heroHighlightsService.getAll().subscribe({
      next: (highlights) => this.highlights.set(highlights),
      error: () => this.highlights.set([]),
    });
  }
}
