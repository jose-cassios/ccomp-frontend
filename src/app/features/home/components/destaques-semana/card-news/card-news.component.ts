import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface Destaque {
  id: string;
  cover_image_url?: string;
  slug: string;
  title: string;
  summary: string;
  featured: boolean;
  autorId?: string;
}

@Component({
  selector: 'app-card-news',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './card-news.component.html',
  styleUrl: './card-news.component.css',
})
export class CardNewsComponent {
  readonly destaque = input.required<Destaque>();
}
