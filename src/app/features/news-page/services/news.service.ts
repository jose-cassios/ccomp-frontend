import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import {
  NewsItemType,
  MessageResponse,
  NewsEditorUser,
  NewsPageResponse,
  NewsUpdatePayload,
  UserNewsResponse,
} from '../interface/news.interface';
import { HttpParams } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class NewsService {
  constructor(private api: ApiService) {}

  getAll(
    filter: { featured?: boolean } = {},
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
    return this.api.delete<MessageResponse>(`/news/${id}`);
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
