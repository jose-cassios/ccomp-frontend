import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiConfig } from './api.config';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  constructor(
    private http: HttpClient,
    private apiConfig: ApiConfig
  ) {}

  get<T>(endpoint: string, options?: {
    params?: HttpParams;
    headers?: HttpHeaders;
  }): Observable<T> {
    return this.http.get<T>(this.apiConfig.buildUrl(endpoint), options);
  }

  post<T>(endpoint: string, body: any, options?: {
    params?: HttpParams;
    headers?: HttpHeaders;
  }): Observable<T> {
    return this.http.post<T>(this.apiConfig.buildUrl(endpoint), body, options);
  }

  put<T>(endpoint: string, body: any, options?: {
    params?: HttpParams;
    headers?: HttpHeaders;
  }): Observable<T> {
    return this.http.put<T>(this.apiConfig.buildUrl(endpoint), body, options);
  }

  patch<T>(endpoint: string, body: any, options?: {
    params?: HttpParams;
    headers?: HttpHeaders;
  }): Observable<T> {
    return this.http.patch<T>(this.apiConfig.buildUrl(endpoint), body, options);
  }

  delete<T>(endpoint: string, options?: {
    params?: HttpParams;
    headers?: HttpHeaders;
  }): Observable<T> {
    return this.http.delete<T>(this.apiConfig.buildUrl(endpoint), options);
  }
}
