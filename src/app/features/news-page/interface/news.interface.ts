export interface NewsItemType {
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  coverImageUrl: string | null;
  featured: boolean;
  publishedAt: string | null;
  updatedAt?: string | null;
  content?: string | null;
}

export interface NewsUpdatePayload {
  title?: string;
  summary?: string;
  coverImageUrl?: string;
  featured?: boolean;
  content?: string;
}

export interface NewsPageResponse {
  content: NewsItemType[];
  nextCursor: string | null;
  previousCursor: string | null;
}

export interface UserNewsResponse {
  author: NewsItemType[];
  editor: NewsItemType[];
}
