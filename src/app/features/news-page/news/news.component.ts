import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NewsPreviewComponent } from '../components/news-preview/news-preview.component';
import { type NewsItemType } from '../interface/news.interface';
import { NewsService } from '../services/news.service';

@Component({
  selector: 'app-news',
  standalone: true,
  imports: [RouterLink, NewsPreviewComponent],
  templateUrl: './news.component.html',
  styleUrl: './news.component.css',
})
export class NewsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly newsService = inject(NewsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly news = signal<NewsItemType | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const slug = params.get('slug');
      if (!slug) {
        this.isLoading.set(false);
        this.errorMessage.set('Notícia não encontrada.');
        return;
      }
      this.loadNews(slug);
    });
  }

  private loadNews(slug: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.newsService.getBySlug(slug).subscribe({
      next: (news) => {
        this.news.set(news);
        this.isLoading.set(false);
      },
      error: () => {
        this.news.set(null);
        this.errorMessage.set('Não foi possível localizar a notícia solicitada.');
        this.isLoading.set(false);
      },
    });
  }
}
