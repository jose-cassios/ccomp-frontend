import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NewsHeroComponent } from './components/news-hero/news-hero.component';
import { NewsCardComponent } from './components/news-card/news-card.component';
import { NewsSidebarComponent } from './components/news-sidebar/news-sidebar.component';
import { NewsModalComponent } from './components/news-modal/news-modal.component';
import { NEWS_ITEMS, type NewsItem } from './data/news.mock';

@Component({
  selector: 'app-news-page',
  standalone: true,
  imports: [
    CommonModule,
    NewsHeroComponent,
    NewsCardComponent,
    NewsSidebarComponent,
    NewsModalComponent
  ],
  templateUrl: './news-page.component.html',
  styleUrl: './news-page.component.css',
})
export class NewsPageComponent {
  noticias = signal<NewsItem[]>(NEWS_ITEMS);
  modalOpen = signal(false);

  noticiaDestaque = this.noticias().find(n => n.featured) || this.noticias()[0];
  noticiasLista = this.noticias().filter(n => n.featured);

  openModal(): void {
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
  }

  onSaveNews(newsData: NewsItem): void {
    this.noticias.update(current => [newsData, ...current]);
    this.noticiaDestaque = this.noticias().find(n => n.featured) || this.noticias()[0];
    this.noticiasLista = this.noticias().filter(n => n.featured);
    this.closeModal();
  }
}
