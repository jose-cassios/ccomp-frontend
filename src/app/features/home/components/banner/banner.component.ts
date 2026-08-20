import { Component, computed, effect, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GlobalHighlight } from '../../models/global-highlight.model';

interface StatItem {
  valor: string;
  label: string;
}

@Component({
  selector: 'app-banner',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './banner.component.html',
  styleUrl: './banner.component.css'
})
export class BannerComponent {
  readonly highlights = input<readonly GlobalHighlight[]>([]);
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
  image_url: '/img3.png',
  label: 'Últimas notícias',
  link: '/eventos',
};
