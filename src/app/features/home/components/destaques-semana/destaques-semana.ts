import { Component, input, computed } from '@angular/core';
import { CardNewsComponent, type Destaque } from './card-news/card-news.component';
import { NewsItemType } from '../../../news-page/interface/news.interface';

@Component({
  selector: 'app-destaques-semana',
  imports: [CardNewsComponent],
  templateUrl: './destaques-semana.html',
  styleUrl: './destaques-semana.css',
})
export class DestaquesSemana {
  readonly newsItems = input.required<NewsItemType[]>();

  readonly destaques = computed<Destaque[]>(() => {
    return this.newsItems().filter((item) => item.featured).map((item) => ({
      id: String(item.id),
      cover_image_url: item.cover_image_url,
      slug: item.slug,
      title: item.title,
      summary: item.summary,
      featured: item.featured,
      autorId: item.autorId,
    }));
  });
}
