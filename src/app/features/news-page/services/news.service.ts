import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import {
  NewsItemType,
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

  getAll(filter?: { featured?: boolean }): Observable<NewsPageResponse> {
    let params: HttpParams | undefined;
    if (filter && filter.featured !== undefined) {
      params = new HttpParams().set('featured', filter.featured.toString());
    }
    return this.api.get<NewsPageResponse>('/news', { params });
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
}
