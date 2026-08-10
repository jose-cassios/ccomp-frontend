import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { NewsItem } from '../data/news.mock';

@Injectable({
  providedIn: 'root',
})
export class NewsService {
  constructor(
    private api: ApiService
  ) {}

  getAll(): Observable<NewsItem[]> {
    return this.api.get<NewsItem[]>('/news');
  }

  getBySlug(slug: string): Observable<NewsItem> {
    return this.api.get<NewsItem>(`/news/${slug}`);
  }

  create(newsData: Partial<NewsItem>): Observable<NewsItem> {
    return this.api.post<NewsItem>('/news', newsData);
  }

  update(id: string, newsData: Partial<NewsItem>): Observable<NewsItem> {
    return this.api.put<NewsItem>(`/news/${id}`, newsData);
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/news/${id}`);
  }
}
