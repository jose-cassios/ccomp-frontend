import { eventTimestamp } from '../../../events-page/models/event-time';
import { isPlatformBrowser } from '@angular/common';
import { AfterViewInit, Component, computed, effect, inject, input, OnDestroy, output, PLATFORM_ID, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AgendaMesComponent } from '../agenda-mes/agenda-mes.component';
import { ProximosEventosComponent } from '../../../events-page/components/proximos-eventos/proximos-eventos.component';
import { EventListItem } from '../../../events-page/models/event.model';
import { GlobalHighlight } from '../../models/global-highlight.model';
import { EventCoverDirective } from '../../../events-page/components/event-cover.directive';

@Component({
  selector: 'app-banner',
  standalone: true,
  imports: [RouterLink, AgendaMesComponent, ProximosEventosComponent, EventCoverDirective],
  templateUrl: './banner.component.html',
  styleUrl: './banner.component.css'
})
export class BannerComponent implements AfterViewInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  private carouselTimer: ReturnType<typeof setInterval> | null = null;
  readonly highlights = input<readonly GlobalHighlight[]>([]);
  readonly events = input<readonly EventListItem[]>([]);
  readonly newsCount = input(0);
  readonly eventsLoading = input(false);
  readonly eventsError = input<string | null>(null);
  readonly retryEvents = output<void>();
  readonly selectedDay = signal<Date | null>(null);
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
      const start = day ? new Date(event.start_date).getTime() : eventTimestamp(event.start_date, event.time_zone);
      const rawEnd = event.end_date ? (day ? new Date(event.end_date).getTime() : eventTimestamp(event.end_date, event.time_zone)) : start;
      const end = Number.isFinite(rawEnd) ? Math.max(start, rawEnd) : start;
      if (!Number.isFinite(start)) return false;
      return day ? start < nextDay && (end > day.getTime() || start === day.getTime()) : end >= now;
    }).sort((a, b) => eventTimestamp(a.start_date, a.time_zone) - eventTimestamp(b.start_date, b.time_zone));
  });
  openEvent(id: number): void {
    void this.router.navigate(['/eventos', id]);
  }
  readonly canManageHighlights = input(false);
  readonly manageHighlights = output<void>();
  readonly currentIndex = signal(0);
  readonly currentHighlight = computed(() =>
    this.highlights()[this.currentIndex()] ?? this.highlights()[0] ?? DEFAULT_HIGHLIGHT,
  );
  readonly carouselItems = computed(() => this.highlights().length ? this.highlights() : [DEFAULT_HIGHLIGHT]);

  constructor() {
    effect(() => {
      if (this.currentIndex() >= this.carouselItems().length) this.currentIndex.set(0);
    });
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.carouselTimer = setInterval(() => {
      if (this.carouselItems().length > 1 && !this.hovered() && !this.focused()) this.next();
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
