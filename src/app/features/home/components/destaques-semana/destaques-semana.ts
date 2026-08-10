import { Component } from '@angular/core';
import { CardNewsComponent, type Destaque } from './card-news/card-news.component';
import { NEWS_ITEMS } from '../../../news-page/data/news.mock';

@Component({
  selector: 'app-destaques-semana',
  imports: [CardNewsComponent],
  templateUrl: './destaques-semana.html',
  styleUrl: './destaques-semana.css',
})
export class DestaquesSemana {
  readonly destaques: Destaque[] = NEWS_ITEMS.filter((item) => item.featured).map((item) => ({
    id: item.id,
    coverImageUrl: item.coverImageUrl,
    slug: item.slug,
    title: item.title,
    summary: item.summary,
    featured: item.featured,
    autorId: item.autorId,
  }));
}
