import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface Destaque {
  id: string;
  coverImageUrl: string | null;
  slug: string;
  title: string;
  summary: string | null;
  featured: boolean;
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
