import { EventListItem } from '../../events-page/models/event.model';
import { NewsItemType } from '../../news-page/interface/news.interface';

export type HighlightSourceType = 'NEWS' | 'EVENT' | 'CLUB';

/** Resposta retornada por GET /highlights. */
export interface HighlightsResponse {
  news: NewsItemType[];
  events: EventListItem[];
  clubs: HighlightClub[];
}

/**
 * O cadastro de clubes ainda usa campos em português. Os aliases mantêm o
 * card compatível enquanto a entidade de clube é consolidada no backend.
 */
export interface HighlightClub {
  id: number | string;
  titulo?: string;
  title?: string;
  descricao?: string | null;
  description?: string | null;
  imagem?: string | null;
  image_url?: string | null;
  cover_image_url?: string | null;
  slug?: string;
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
