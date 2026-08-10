import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';

export interface Clube {
  id?: string;
  titulo: string;
  descricao: string;
  imagem: string;
  categoria: string;
  data: string;
  autor: {
    nome: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class ClubesService {
  constructor(
    private api: ApiService
  ) {}

  getAll(): Observable<Clube[]> {
    return this.api.get<Clube[]>('/clubes');
  }

  getById(id: string): Observable<Clube> {
    return this.api.get<Clube>(`/clubes/${id}`);
  }

  getByCategory(categoria: string): Observable<Clube[]> {
    return this.api.get<Clube[]>(`/clubes?categoria=${categoria}`);
  }

  create(clubeData: Partial<Clube>): Observable<Clube> {
    return this.api.post<Clube>('/clubes', clubeData);
  }

  update(id: string, clubeData: Partial<Clube>): Observable<Clube> {
    return this.api.put<Clube>(`/clubes/${id}`, clubeData);
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/clubes/${id}`);
  }

  getFeatured(): Observable<Clube[]> {
    return this.api.get<Clube[]>('/clubes/featured');
  }
}
