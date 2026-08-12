export interface NewsItemType {
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  cover_image_url: string | null;
  featured: boolean;
  published_at: string | null;
  updated_at?: string | null;
  content?: string | null;
}

export interface NewsUpdatePayload {
  title?: string;
  summary?: string;
  cover_image_url?: string;
  featured?: boolean;
  content?: string;
}

export interface NewsPageResponse {
  content: NewsItemType[];
  next_cursor: string | null;
  previous_cursor: string | null;
}

export interface UserNewsResponse {
  author: NewsItemType[];
  editor: NewsItemType[];
}
