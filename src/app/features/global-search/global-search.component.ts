import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs';
import { GlobalSearchResult, GlobalSearchResults, GlobalSearchService } from './global-search.service';

const EMPTY_RESULTS: GlobalSearchResults = { events: [], news: [], clubs: [] };

@Component({
  selector: 'app-global-search',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './global-search.component.html',
  styleUrl: './global-search.component.css',
})
export class GlobalSearchComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchService = inject(GlobalSearchService);
  private requestId = 0;

  readonly query = signal('');
  readonly inputValue = signal('');
  readonly results = signal<GlobalSearchResults>(EMPTY_RESULTS);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly resultCount = computed(() => {
    const items = this.results();
    return items.events.length + items.news.length + items.clubs.length;
  });

  ngOnInit(): void {
    this.route.queryParamMap.pipe(
      map((params) => params.get('q')?.trim() ?? ''),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((query) => this.load(query));
  }

  submitSearch(value: string): void {
    const query = value.trim();
    if (!query) return;
    void this.router.navigate(['/busca'], { queryParams: { q: query } });
  }

  resultTypeLabel(type: GlobalSearchResult['type']): string {
    return { event: 'Evento', news: 'Notícia', club: 'Clube' }[type];
  }

  excerpt(result: GlobalSearchResult): string {
    const source = result.content || result.summary || 'Sem descrição adicional.';
    const text = source.replace(/[#*_>`[\]]/g, ' ').replace(/\s+/g, ' ').trim();
    return text.length > 210 ? `${text.slice(0, 207).trimEnd()}…` : text;
  }

  private load(query: string): void {
    this.query.set(query);
    this.inputValue.set(query);
    this.error.set(null);

    if (query.length < 2) {
      this.results.set(EMPTY_RESULTS);
      this.loading.set(false);
      return;
    }

    const id = ++this.requestId;
    this.loading.set(true);
    this.searchService.search(query).subscribe({
      next: (results) => {
        if (id !== this.requestId) return;
        this.results.set(results);
        this.loading.set(false);
      },
      error: () => {
        if (id !== this.requestId) return;
        this.results.set(EMPTY_RESULTS);
        this.error.set('Não foi possível concluir a busca agora. Tente novamente.');
        this.loading.set(false);
      },
    });
  }
}
