import { EventListItem } from '../../events-page/models/event.model';
import { NewsItemType } from '../../news-page/interface/news.interface';
import { Club } from '../../clubes/models/clube.model';

export type HighlightSourceType = 'NEWS' | 'EVENT' | 'CLUB';

/** Resposta retornada por GET /highlights. */
export interface HighlightsResponse {
  news: NewsItemType[];
  events: EventListItem[];
  clubs: Club[];
}

/** Formato de apresentação único para o carrossel da home. */
export interface GlobalHighlight {
  id: string;
  source_type: HighlightSourceType;
  source_id: number | string;
  title: string;
  summary: string | null;
  image_url: string | null;
  label: string;
  link: string;
}
