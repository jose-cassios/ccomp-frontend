export interface NewsItemType {
  id: number | string;
  title: string;
  slug: string;
  summary: string;
  coverImageUrl?: string;
  cover_image_url?: string;
  featured: boolean;
  autorId?: string;
  publishedAt?: Date | string;
  published_at?: string;
  updatedAt?: Date | string;
  updated_at?: string;
  content?: string[];
}
