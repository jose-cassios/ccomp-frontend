import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import {
  GlobalHighlight,
  HighlightCandidate,
  HighlightSelection,
} from '../models/global-highlight.model';

@Injectable({ providedIn: 'root' })
export class HeroHighlightsService {
  private readonly api = inject(ApiService);

  getAll(): Observable<GlobalHighlight[]> {
    return this.api.get<GlobalHighlight[]>('/highlights');
  }

  getCandidates(): Observable<HighlightCandidate[]> {
    return this.api.get<HighlightCandidate[]>('/highlights/candidates');
  }

  update(selections: HighlightSelection[]): Observable<GlobalHighlight[]> {
    return this.api.put<GlobalHighlight[]>('/highlights', selections);
  }
}
