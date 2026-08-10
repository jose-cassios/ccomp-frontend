import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiConfig } from '../../../core/api/api.config';

@Injectable({
  providedIn: 'root',
})
export class NewsService {
  constructor(
    private http: HttpClient,
    private apiConfig: ApiConfig
  ) {}

  createNewsTemplate(): Observable<any> {
    return this.http.post<any>(`${this.apiConfig.buildUrl('/news/create')}`, null);
  }
}
