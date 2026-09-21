import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable, catchError, defer, expand, forkJoin, from, map, mergeMap, of, reduce, switchMap, throwError, toArray } from 'rxjs';
import { Club } from '../clubes/models/clube.model';
import { ClubesService } from '../clubes/services/clubes.service';
import { EventListItem } from '../events-page/models/event.model';
import { EventsPageResponse } from '../events-page/models/event.model';
import { EventsService } from '../events-page/services/events.service';
import { NewsItemType, NewsPageResponse } from '../news-page/interface/news.interface';
import { NewsService } from '../news-page/services/news.service';

export type GlobalSearchResultType = 'event' | 'news' | 'club';

export interface GlobalSearchResult {
  id: number;
  type: GlobalSearchResultType;
  title: string;
  summary: string | null;
  content: string | null;
  imageUrl: string | null;
  link: string[];
  queryParams?: Record<string, number>;
  matchLabel: string;
}

export interface GlobalSearchResults {
  events: GlobalSearchResult[];
  news: GlobalSearchResult[];
  clubs: GlobalSearchResult[];
}

@Injectable({ providedIn: 'root' })
export class GlobalSearchService {
  private readonly eventsService = inject(EventsService);
  private readonly newsService = inject(NewsService);
  private readonly clubsService = inject(ClubesService);

  search(query: string): Observable<GlobalSearchResults> {
    const normalizedQuery = normalize(query);
    if (normalizedQuery.length < 2) {
      return of({ events: [], news: [], clubs: [] });
    }

    return forkJoin({
      events: this.allEvents().pipe(map((items) => items
        .map((event) => this.eventResult(event, normalizedQuery))
        .filter((result): result is GlobalSearchResult => result !== null)), catchError(() => of([]))),
      news: this.allNewsWithContent().pipe(map((items) => items
        .map((news) => this.newsResult(news, normalizedQuery))
        .filter((result): result is GlobalSearchResult => result !== null)), catchError(() => of([]))),
      clubs: this.allClubs().pipe(map((items) => items
        .map((club) => this.clubResult(club, normalizedQuery))
        .filter((result): result is GlobalSearchResult => result !== null)), catchError(() => of([]))),
    });
  }

  private allEvents(): Observable<EventListItem[]> {
    return this.collectPages((cursor) => this.eventsService.search({}, cursor, 50));
  }

  private allClubs(): Observable<Club[]> {
    return this.collectPages((cursor) => this.clubsService.search(cursor, 50));
  }

  private allNewsWithContent(): Observable<NewsItemType[]> {
    return this.collectPages((cursor) => this.newsService.getAll({}, cursor, 50)).pipe(
      switchMap((items) => from(items.filter((item) => Boolean(item.published_at))).pipe(
        // A API de listagem de notícias não retorna o corpo; limita-se a seis detalhes simultâneos.
        mergeMap((item) => this.newsService.getBySlug(item.slug).pipe(catchError(() => [item])), 6),
        toArray(),
      )),
    );
  }

  private collectPages<T>(load: (cursor?: string) => Observable<{ content: T[]; next_cursor: string | null }>): Observable<T[]> {
    return defer(() => {
      const cursors = new Set<string>();
      return load().pipe(
        expand((page) => {
          const cursor = page.next_cursor;
          if (!cursor) return EMPTY;
          if (cursors.has(cursor)) {
            return throwError(() => new Error('A API repetiu o cursor durante a busca.'));
          }
          cursors.add(cursor);
          return load(cursor);
        }),
        reduce((all, page) => {
          const byId = new Map(all.map((item) => [this.itemId(item), item]));
          page.content.forEach((item) => byId.set(this.itemId(item), item));
          return [...byId.values()];
        }, [] as T[]),
      );
    });
  }

  private itemId(item: unknown): number {
    return (item as { id: number }).id;
  }

  private eventResult(event: EventListItem, query: string): GlobalSearchResult | null {
    return makeResult({
      id: event.id,
      type: 'event',
      title: event.title,
      summary: event.description,
      content: event.content ?? null,
      imageUrl: event.cover_image_url ?? null,
      link: ['/eventos', String(event.id)],
    }, query);
  }

  private newsResult(news: NewsItemType, query: string): GlobalSearchResult | null {
    return makeResult({
      id: news.id,
      type: 'news',
      title: news.title,
      summary: news.summary,
      content: news.content ?? null,
      imageUrl: news.cover_image_url,
      link: ['/news', news.slug],
    }, query);
  }

  private clubResult(club: Club, query: string): GlobalSearchResult | null {
    return makeResult({
      id: club.id,
      type: 'club',
      title: club.name,
      summary: club.summary,
      content: club.content,
      imageUrl: club.cover_image_url,
      link: ['/projetos/clubes'],
      queryParams: { club: club.id },
    }, query);
  }
}

function makeResult(
  result: Omit<GlobalSearchResult, 'matchLabel'>,
  query: string,
): GlobalSearchResult | null {
  const fields: Array<[string, string | null | undefined]> = [
    ['Título', result.title],
    ['Resumo', result.summary],
    ['Conteúdo', result.content],
  ];
  const match = fields.find(([, value]) => normalize(value).includes(query));
  return match ? { ...result, matchLabel: match[0] } : null;
}

function normalize(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}
