import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NEWS_ITEMS, type NewsItem } from '../data/news.mock';

@Component({
  selector: 'app-news',
  imports: [],
  templateUrl: './news.component.html',
  styleUrl: './news.component.css',
})
export class NewsComponent {
  private readonly route = inject(ActivatedRoute);

  readonly slug = signal<string>('');
  readonly selectedNews = computed<NewsItem | undefined>(() => {
    const currentSlug = this.slug();
    return NEWS_ITEMS.find((item) => item.slug === currentSlug);
  });

  constructor() {
    this.route.paramMap.subscribe((params) => {
      this.slug.set(params.get('slug') ?? params.get('id') ?? '');
    });
  }
}
