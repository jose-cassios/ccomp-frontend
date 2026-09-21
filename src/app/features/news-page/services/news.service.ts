import { Injectable } from '@angular/core';
import { Observable, catchError, of, switchMap, throwError } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import {
  NewsItemType,
  MessageResponse,
  NewsEditorUser,
  NewsPageResponse,
  NewsSearchFilter,
  NewsUpdatePayload,
  UserNewsResponse,
} from '../interface/news.interface';
import { HttpErrorResponse, HttpParams } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class NewsService {
  constructor(private api: ApiService) {}

  getAll(
    filter: NewsSearchFilter = {},
    nextCursor?: string,
    pageSize = 10,
  ): Observable<NewsPageResponse> {
    let params = new HttpParams().set('pageSize', pageSize.toString());
    if (nextCursor) {
      params = params.set('nextCursor', nextCursor);
    }

    return this.api.post<NewsPageResponse>('/news/search', filter, { params });
  }

  getBySlug(slug: string): Observable<NewsItemType> {
    return this.api.get<NewsItemType>(`/news/${slug}`);
  }

  getById(id: number | string): Observable<NewsItemType> {
    return this.api.get<NewsItemType>(`/news/admin/${id}`);
  }

  getMine(): Observable<UserNewsResponse> {
    return this.api.get<UserNewsResponse>('/news/me');
  }

  create(): Observable<NewsItemType> {
    return this.api.post<NewsItemType>('/news/create', {});
  }

  update(id: number | string, newsData: NewsUpdatePayload): Observable<NewsItemType> {
    return this.api.patch<NewsItemType>(`/news/${id}`, newsData);
  }

  publish(id: number | string): Observable<void> {
    return this.api.post<void>(`/news/${id}/publish`, {});
  }

  delete(id: number | string): Observable<MessageResponse> {
    return this.api.delete<MessageResponse>(`/news/${id}`).pipe(
      switchMap((response) => this.getById(id).pipe(
        switchMap(() => throwError(() => new HttpErrorResponse({ status: 502, error: {
          message: 'A API respondeu à exclusão, mas a notícia continua cadastrada. A exclusão ainda precisa ser corrigida no backend.',
        } }))),
        catchError((error: unknown) => error instanceof HttpErrorResponse && error.status === 404
          ? of(response) : throwError(() => error)),
      )),
    );
  }

  getEditors(newsId: number | string): Observable<NewsEditorUser[]> {
    return this.api.get<NewsEditorUser[]>(`/news/${newsId}/editors`);
  }

  addEditor(newsId: number | string, email: string): Observable<MessageResponse> {
    return this.api.post<MessageResponse>(
      `/news/${newsId}/editors/${encodeURIComponent(email)}`,
      {},
    );
  }

  removeEditor(newsId: number | string, email: string): Observable<MessageResponse> {
    return this.api.delete<MessageResponse>(
      `/news/${newsId}/editors/${encodeURIComponent(email)}`,
    );
  }
}
