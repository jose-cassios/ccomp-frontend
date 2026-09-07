import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { NEWS_MANAGEMENT_ROLES } from '../auth/config/auth.config';
import { AuthService } from '../auth/services/auth.service';
import { NewsCardComponent } from './components/news-card/news-card.component';
import { NewsSidebarComponent } from './components/news-sidebar/news-sidebar.component';
import { type NewsItemType } from './interface/news.interface';
import { NewsService } from './services/news.service';

@Component({
  selector: 'app-news-page',
  standalone: true,
  imports: [CommonModule, RouterLink, NewsCardComponent, NewsSidebarComponent],
  templateUrl: './news-page.component.html',
  styleUrl: './news-page.component.css',
})
export class NewsPageComponent implements OnInit {
  private readonly newsService = inject(NewsService);
  private readonly authService = inject(AuthService);

  readonly noticias = signal<NewsItemType[]>([]);
  readonly drafts = signal<NewsItemType[]>([]);
  readonly editableNewsIds = signal<ReadonlySet<number>>(new Set());
  readonly authoredNewsIds = signal<ReadonlySet<number>>(new Set());
  readonly searchQuery = signal('');
  readonly isLoading = signal(true);
  readonly isLoadingMore = signal(false);
  readonly nextCursor = signal<string | null>(null);
  readonly draftsLoading = signal(false);
  readonly deletingNewsId = signal<number | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly draftsError = signal<string | null>(null);
  readonly draftsSuccess = signal<string | null>(null);
  readonly canManageNews = computed(() => this.authService.hasAnyRole(NEWS_MANAGEMENT_ROLES));
  readonly isAuthenticated = this.authService.isAuthenticatedState;
  readonly showEditorialArea = computed(() =>
    this.canManageNews() || this.draftsLoading() || this.editableNewsIds().size > 0,
  );
  readonly hasSearchQuery = computed(() => Boolean(this.searchQuery().trim()));
  readonly filteredNews = computed(() => {
    const query = this.normalizeSearchText(this.searchQuery());
    if (!query) return this.noticias();

    return this.noticias().filter((news) =>
      [news.title, news.summary]
        .filter((value): value is string => Boolean(value))
        .some((value) => this.normalizeSearchText(value).includes(query)),
    );
  });

  ngOnInit(): void {
    this.loadNews();
    if (this.isAuthenticated()) {
      this.loadDrafts();
    }
  }

  loadNews(loadMore = false): void {
    const cursor = loadMore ? this.nextCursor() ?? undefined : undefined;
    if (loadMore && !cursor) return;

    (loadMore ? this.isLoadingMore : this.isLoading).set(true);
    this.errorMessage.set(null);
    this.newsService.getAll({}, cursor, 50).pipe(
      finalize(() => (loadMore ? this.isLoadingMore : this.isLoading).set(false)),
    ).subscribe({
      next: (response) => {
        if (loadMore) {
          const newsById = new Map(this.noticias().map((news) => [news.id, news]));
          response.content.forEach((news) => newsById.set(news.id, news));
          this.noticias.set([...newsById.values()]);
        } else {
          this.noticias.set(response.content);
        }
        this.nextCursor.set(response.next_cursor);
      },
      error: () => {
        this.errorMessage.set('Não foi possível carregar as notícias. Tente novamente em instantes.');
      },
    });
  }

  loadDrafts(): void {
    this.draftsLoading.set(true);
    this.draftsError.set(null);
    this.newsService.getMine().subscribe({
      next: (response) => {
        const newsById = new Map(
          [...response.author, ...response.editor]
            .filter((news) => !news.published_at)
            .map((news) => [news.id, news]),
        );
        this.drafts.set([...newsById.values()]);
        this.authoredNewsIds.set(new Set(response.author.map((news) => news.id)));
        this.editableNewsIds.set(
          new Set([...response.author, ...response.editor].map((news) => news.id)),
        );
        this.draftsLoading.set(false);
      },
      error: () => {
        this.draftsError.set('Não foi possível carregar suas notícias para edição.');
        this.draftsLoading.set(false);
      },
    });
  }

  updateSearch(query: string): void {
    this.searchQuery.set(query);
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  canEditNews(news: NewsItemType): boolean {
    return this.editableNewsIds().has(news.id);
  }

  canDeleteDraft(news: NewsItemType): boolean {
    return this.authoredNewsIds().has(news.id);
  }

  deleteDraft(draft: NewsItemType): void {
    if (this.deletingNewsId() !== null) return;
    if (typeof window !== 'undefined' && !window.confirm(`Excluir o rascunho “${draft.title}”?`)) {
      return;
    }

    this.deletingNewsId.set(draft.id);
    this.draftsError.set(null);
    this.draftsSuccess.set(null);
    this.newsService.delete(draft.id).pipe(
      finalize(() => this.deletingNewsId.set(null)),
    ).subscribe({
      next: (response) => {
        this.drafts.update((drafts) => drafts.filter((item) => item.id !== draft.id));
        this.editableNewsIds.update((ids) => {
          const updatedIds = new Set(ids);
          updatedIds.delete(draft.id);
          return updatedIds;
        });
        this.draftsSuccess.set(response.response || 'Rascunho excluído com sucesso.');
      },
      error: () => {
        this.draftsError.set('Não foi possível excluir este rascunho.');
      },
    });
  }

  private normalizeSearchText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase()
      .trim();
  }
}
