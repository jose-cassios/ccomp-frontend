import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { NewsItem } from '../data/news.mock';
import { AuthService } from '../../auth/services/auth.service';
import { HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class NewsService {
  constructor(
    private api: ApiService,
    private authService: AuthService
  ) {}

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  getAll(): Observable<NewsItem[]> {
    return this.api.get<NewsItem[]>('/news');
  }

  getBySlug(slug: string): Observable<NewsItem> {
    return this.api.get<NewsItem>(`/news/${slug}`);
  }

  create(newsData: Partial<NewsItem>): Observable<NewsItem> {
    return this.api.post<NewsItem>('/news/create', newsData, {
      headers: this.getAuthHeaders()
    });
  }

  update(id: string, newsData: Partial<NewsItem>): Observable<NewsItem> {
    return this.api.put<NewsItem>(`/news/${id}`, newsData, {
      headers: this.getAuthHeaders()
    });
  }

  patch(id: string, newsData: Partial<NewsItem>): Observable<NewsItem> {
    return this.api.patch<NewsItem>(`/news/${id}`, newsData, {
      headers: this.getAuthHeaders()
    });
  }

  publish(id: string): Observable<NewsItem> {
    return this.api.post<NewsItem>(`/news/${id}/publish`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/news/${id}`, {
      headers: this.getAuthHeaders()
    });
  }
}
