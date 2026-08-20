import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { MarkdownContentComponent } from '../markdown-content/markdown-content.component';

export interface NewsPreviewData {
  title: string;
  summary: string | null;
  cover_image_url: string | null;
  featured: boolean;
  published_at?: string | null;
  updated_at?: string | null;
  content?: string | null;
}

@Component({
  selector: 'app-news-preview',
  standalone: true,
  imports: [DatePipe, MarkdownContentComponent],
  templateUrl: './news-preview.component.html',
  styleUrl: './news-preview.component.css',
})
export class NewsPreviewComponent {
  readonly news = input.required<NewsPreviewData>();
  readonly editorPreview = input(false);
}
