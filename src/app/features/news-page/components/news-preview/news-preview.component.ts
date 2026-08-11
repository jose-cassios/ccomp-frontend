import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { MarkdownContentComponent } from '../markdown-content/markdown-content.component';

export interface NewsPreviewData {
  title: string;
  summary: string | null;
  coverImageUrl: string | null;
  featured: boolean;
  publishedAt?: string | null;
  updatedAt?: string | null;
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
