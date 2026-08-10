import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';

export interface Evento {
  id?: number;
  sigla: string;
  modalidade: string;
  titulo: string;
  descricao: string;
  data: string;
  horario?: string;
  local?: string;
  vagas?: number;
  imagemUrl: string;
  cargaHoraria?: string;
  certificado?: boolean;
  publico?: string;
  preRequisito?: string;
  inscritos?: number;
  status?: string;
  statusClass?: string;
  vagasRestantes?: number;
  vagasTotal?: number;
}

@Injectable({
  providedIn: 'root',
})
export class EventsService {
  constructor(
    private api: ApiService
  ) {}

  getAll(): Observable<Evento[]> {
    return this.api.get<Evento[]>('/events');
  }

  getById(id: number): Observable<Evento> {
    return this.api.get<Evento>(`/events/${id}`);
  }

  create(eventoData: Partial<Evento>): Observable<Evento> {
    return this.api.post<Evento>('/events', eventoData);
  }

  update(id: number, eventoData: Partial<Evento>): Observable<Evento> {
    return this.api.put<Evento>(`/events/${id}`, eventoData);
  }

  delete(id: number): Observable<void> {
    return this.api.delete<void>(`/events/${id}`);
  }

  getFeatured(): Observable<Evento> {
    return this.api.get<Evento>('/events/featured');
  }

  getUpcoming(): Observable<Evento[]> {
    return this.api.get<Evento[]>('/events/upcoming');
  }
}
