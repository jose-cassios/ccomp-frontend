import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NewsItem } from '../../data/news.mock';

@Component({
  selector: 'app-news-card',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './news-card.component.html',
  styleUrl: './news-card.component.css'
})
export class NewsCardComponent {
  readonly news = input.required<NewsItem>();
}
