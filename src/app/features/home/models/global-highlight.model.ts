export type HighlightSourceType = 'NEWS' | 'EVENT' | 'CLUB';

export interface GlobalHighlight {
  id: number;
  source_type: HighlightSourceType;
  source_id: number;
  title: string;
  summary: string | null;
  image_url: string | null;
  label: string;
  link: string;
}

export interface HighlightCandidate {
  source_type: HighlightSourceType;
  source_id: number;
  title: string;
  summary: string | null;
  image_url: string | null;
  label: string;
  link: string;
}

export interface HighlightSelection {
  source_type: HighlightSourceType;
  source_id: number;
}
