import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { NewsItemType } from '../interface/news.interface';
import { AuthService } from '../../auth/services/auth.service';
import { HttpHeaders, HttpParams } from '@angular/common/http';

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

  getAll(filter?: { featured?: boolean }): Observable<{ content: NewsItemType[] }> {
    let params: HttpParams | undefined;
    if (filter && filter.featured !== undefined) {
      params = new HttpParams().set('featured', filter.featured.toString());
    }
    return this.api.get<{ content: NewsItemType[] }>('/news', { params });
  }

  getBySlug(slug: string): Observable<NewsItemType> {
    return this.api.get<NewsItemType>(`/news/${slug}`);
  }

  create(newsData: Partial<NewsItemType>): Observable<NewsItemType> {
    return this.api.post<NewsItemType>('/news/create', newsData, {
      headers: this.getAuthHeaders()
    });
  }

  update(id: string, newsData: Partial<NewsItemType>): Observable<NewsItemType> {
    return this.api.put<NewsItemType>(`/news/${id}`, newsData, {
      headers: this.getAuthHeaders()
    });
  }

  patch(id: string, newsData: Partial<NewsItemType>): Observable<NewsItemType> {
    return this.api.patch<NewsItemType>(`/news/${id}`, newsData, {
      headers: this.getAuthHeaders()
    });
  }

  publish(id: string): Observable<NewsItemType> {
    return this.api.post<NewsItemType>(`/news/${id}/publish`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/news/${id}`, {
      headers: this.getAuthHeaders()
    });
  }
}
