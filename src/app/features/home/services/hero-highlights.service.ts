import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import {
  GlobalHighlight,
  HighlightsResponse,
} from '../models/global-highlight.model';
import { Club } from '../../clubes/models/clube.model';

@Injectable({ providedIn: 'root' })
export class HeroHighlightsService {
  private readonly api = inject(ApiService);

  getAll(): Observable<GlobalHighlight[]> {
    return this.api.get<HighlightsResponse>('/highlights').pipe(
      map((response) => [
        ...(response.news ?? []).map((news) => ({
          id: `NEWS:${news.id}`,
          source_type: 'NEWS' as const,
          source_id: news.id,
          title: news.title,
          summary: news.summary,
          image_url: news.cover_image_url,
          label: 'Notícia em destaque',
          link: `/news/${news.slug}`,
        })),
        ...(response.events ?? []).map((event) => ({
          id: `EVENT:${event.id}`,
          source_type: 'EVENT' as const,
          source_id: event.id,
          title: event.title,
          summary: event.description,
          image_url: null,
          label: 'Evento em destaque',
          link: `/eventos/${event.id}`,
        })),
        ...(response.clubs ?? []).map((club) => this.toClubHighlight(club)),
      ]),
    );
  }

  private toClubHighlight(club: Club): GlobalHighlight {
    return {
      id: `CLUB:${club.id}`,
      source_type: 'CLUB',
      source_id: club.id,
      title: club.name,
      summary: club.summary,
      image_url: club.cover_image_url,
      label: 'Clube em destaque',
      link: '/projetos/clubes',
    };
  }
}
