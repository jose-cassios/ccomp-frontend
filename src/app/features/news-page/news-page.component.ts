import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NewsHeroComponent } from './components/news-hero/news-hero.component';
import { NewsCardComponent } from './components/news-card/news-card.component';
import { NewsSidebarComponent } from './components/news-sidebar/news-sidebar.component';
import { NEWS_ITEMS, type NewsItem } from './data/news.mock';

@Component({
  selector: 'app-news-page',
  standalone: true,
  imports: [
    CommonModule,
    NewsHeroComponent,
    NewsCardComponent,
    NewsSidebarComponent
  ],
  templateUrl: './news-page.component.html',
  styleUrl: './news-page.component.css',
})
export class NewsPageComponent {
  noticias: NewsItem[] = NEWS_ITEMS;
  noticiaDestaque: NewsItem = this.noticias.find(n => n.featured) || this.noticias[0];
  noticiasLista: NewsItem[] = this.noticias.filter(n => n.featured);

  constructor() {
    console.log('Noticias lista:', this.noticiasLista);
    console.log('Noticia destaque:', this.noticiaDestaque);
    console.log('Noticias:', this.noticias);
  }
}
