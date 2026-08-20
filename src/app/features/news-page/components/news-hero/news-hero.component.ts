import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NewsItemType } from '../../interface/news.interface';

@Component({
  selector: 'app-news-hero',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './news-hero.component.html',
  styleUrl: './news-hero.component.css'
})
export class NewsHeroComponent {
  readonly news = input.required<NewsItemType>();
}
