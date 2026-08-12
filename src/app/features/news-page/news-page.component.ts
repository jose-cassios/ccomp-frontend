import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NEWS_MANAGEMENT_ROLES } from '../auth/config/auth.config';
import { AuthService } from '../auth/services/auth.service';
import { NewsCardComponent } from './components/news-card/news-card.component';
import { NewsHeroComponent } from './components/news-hero/news-hero.component';
import { NewsSidebarComponent } from './components/news-sidebar/news-sidebar.component';
import { type NewsItemType } from './interface/news.interface';
import { NewsService } from './services/news.service';

@Component({
  selector: 'app-news-page',
  standalone: true,
  imports: [CommonModule, RouterLink, NewsHeroComponent, NewsCardComponent, NewsSidebarComponent],
  templateUrl: './news-page.component.html',
  styleUrl: './news-page.component.css',
})
export class NewsPageComponent implements OnInit {
  private readonly newsService = inject(NewsService);
  private readonly authService = inject(AuthService);

  readonly noticias = signal<NewsItemType[]>([]);
  readonly drafts = signal<NewsItemType[]>([]);
  readonly isLoading = signal(true);
  readonly draftsLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly draftsError = signal<string | null>(null);
  readonly canManageNews = computed(() => this.authService.hasAnyRole(NEWS_MANAGEMENT_ROLES));

  readonly noticiaDestaque = computed(() =>
    this.noticias().find((news) => news.featured) ?? this.noticias()[0],
  );
  readonly noticiasLista = computed(() => {
    const featuredId = this.noticiaDestaque()?.id;
    return this.noticias().filter((news) => news.id !== featuredId);
  });

  ngOnInit(): void {
    this.loadNews();
    if (this.canManageNews()) {
      this.loadDrafts();
    }
  }

  loadNews(): void {
    this.newsService.getAll().subscribe({
      next: (response) => {
        this.noticias.set(response.content);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Não foi possível carregar as notícias. Tente novamente em instantes.');
        this.isLoading.set(false);
      },
    });
  }

  loadDrafts(): void {
    this.draftsLoading.set(true);
    this.newsService.getMine().subscribe({
      next: (response) => {
        this.drafts.set(response.author.filter((news) => !news.published_at));
        this.draftsLoading.set(false);
      },
      error: () => {
        this.draftsError.set('Não foi possível carregar seus rascunhos.');
        this.draftsLoading.set(false);
      },
    });
  }
}
