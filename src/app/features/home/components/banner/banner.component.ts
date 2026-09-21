import { isPlatformBrowser } from '@angular/common';
import { AfterViewInit, Component, computed, effect, inject, input, OnDestroy, output, PLATFORM_ID, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AgendaMesComponent } from '../agenda-mes/agenda-mes.component';
import { ProximosEventosComponent } from '../../../events-page/components/proximos-eventos/proximos-eventos.component';
import { EventListItem } from '../../../events-page/models/event.model';
import { GlobalHighlight } from '../../models/global-highlight.model';

interface StatItem {
  valor: string;
  label: string;
}

@Component({
  selector: 'app-banner',
  standalone: true,
  imports: [RouterLink, AgendaMesComponent, ProximosEventosComponent],
  templateUrl: './banner.component.html',
  styleUrl: './banner.component.css'
})
export class BannerComponent implements AfterViewInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  private carouselTimer: ReturnType<typeof setInterval> | null = null;
  readonly highlights = input<readonly GlobalHighlight[]>([]);
  readonly events = input<readonly EventListItem[]>([]);
  readonly eventsLoading = input(false);
  readonly eventsError = input<string | null>(null);
  readonly retryEvents = output<void>();
  readonly selectedDay = signal<Date | null>(null);
  readonly carouselPaused = signal(false);
  readonly hovered = signal(false);
  readonly focused = signal(false);
  readonly panelTitle = computed(() => {
    const day = this.selectedDay();
    return day ? 'Eventos em ' + new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(day) : 'Próximos eventos';
  });
  readonly agendaEvents = computed(() => {
    const day = this.selectedDay();
    const now = Date.now();
    const nextDay = day ? new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1).getTime() : 0;
    return this.events().filter(event => {
      if (!event.start_date || event.status === 'CANCELED') return false;
      const start = new Date(event.start_date).getTime();
      const rawEnd = event.end_date ? new Date(event.end_date).getTime() : start;
      const end = Number.isFinite(rawEnd) ? Math.max(start, rawEnd) : start;
      if (!Number.isFinite(start)) return false;
      return day ? start < nextDay && (end > day.getTime() || start === day.getTime()) : end >= now;
    }).sort((a, b) => Date.parse(a.start_date!) - Date.parse(b.start_date!));
  });
  openEvent(id: number): void {
    void this.router.navigate(['/eventos', id]);
  }
  readonly eventsCount = input(0);
  readonly newsCount = input(0);
  readonly canManageHighlights = input(false);
  readonly manageHighlights = output<void>();
  readonly currentIndex = signal(0);
  readonly currentHighlight = computed(() =>
    this.highlights()[this.currentIndex()] ?? this.highlights()[0] ?? DEFAULT_HIGHLIGHT,
  );
  readonly carouselItems = computed(() => this.highlights().length ? this.highlights() : [DEFAULT_HIGHLIGHT]);
  readonly estatisticas = computed<StatItem[]>(() => [
    { valor: String(this.eventsCount()), label: 'Eventos disponíveis' },
    { valor: String(this.newsCount()), label: 'Notícias publicadas' },
  ]);

  constructor() {
    effect(() => {
      if (this.currentIndex() >= this.carouselItems().length) this.currentIndex.set(0);
    });
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.carouselTimer = setInterval(() => {
      if (this.carouselItems().length > 1 && !this.carouselPaused() && !this.hovered() && !this.focused()) this.next();
    }, 6000);
  }

  ngOnDestroy(): void {
    if (this.carouselTimer !== null) clearInterval(this.carouselTimer);
  }

  next() {
    const total = this.carouselItems().length;
    this.currentIndex.update((index) => index === total - 1 ? 0 : index + 1);
  }

  prev() {
    const total = this.carouselItems().length;
    this.currentIndex.update((index) => index === 0 ? total - 1 : index - 1);
  }

  goTo(index: number) {
    this.currentIndex.set(index);
  }
}

const DEFAULT_HIGHLIGHT: GlobalHighlight = {
  id: 'DEFAULT:0',
  source_type: 'EVENT',
  source_id: 0,
  title: 'Semana de Tecnologia',
  summary: 'Acompanhe eventos, notícias e iniciativas da comunidade de Computação.',
  image_url: null,
  label: 'Últimas notícias',
  link: '/eventos',
};
