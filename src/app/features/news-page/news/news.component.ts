import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { type NewsItemType } from '../interface/news.interface';
import { NewsService } from '../services/news.service';

@Component({
  selector: 'app-news',
  imports: [],
  templateUrl: './news.component.html',
  styleUrl: './news.component.css',
})
export class NewsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly newsService = inject(NewsService);

  readonly slug = signal<string>('');
  readonly newsItems = signal<NewsItemType[]>([]);
  readonly selectedNews = computed<NewsItemType | undefined>(() => {
    const currentSlug = this.slug();
    return this.newsItems().find((item) => item.slug === currentSlug);
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.slug.set(params.get('slug') ?? params.get('id') ?? '');
    });
    this.loadNews();
  }

  loadNews(): void {
    this.newsService.getAll().subscribe({
      next: (response) => {
        this.newsItems.set(response.content);
      },
      error: (error) => {
        console.error('Erro ao carregar notícias:', error);
      }
    });
  }
}
