import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NewsHeroComponent } from './components/news-hero/news-hero.component';
import { NewsCardComponent } from './components/news-card/news-card.component';
import { NewsSidebarComponent } from './components/news-sidebar/news-sidebar.component';
import { NewsModalComponent } from './components/news-modal/news-modal.component';
import { type NewsItemType } from './interface/news.interface';
import { NewsService } from './services/news.service';

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
export class NewsPageComponent implements OnInit {
  private newsService = inject(NewsService);
  
  noticias = signal<NewsItemType[]>([]);
  modalOpen = signal(false);
  isLoading = signal(true);

  readonly noticiaDestaque = computed(() => 
    this.noticias().find(n => n.featured) || this.noticias()[0]
  );
  
  readonly noticiasLista = computed(() => 
    this.noticias().filter(n => n.featured)
  );

  ngOnInit(): void {
    this.loadNews();
  }

  loadNews(): void {
    this.newsService.getAll({ featured: true }).subscribe({
      next: (response) => {
        this.noticias.set(response.content);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Erro ao carregar notícias:', error);
        this.isLoading.set(false);
      }
    });
  }

  openModal(): void {
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
  }

  onSaveNews(newsData: NewsItemType): void {
    this.noticias.update(current => [newsData, ...current]);
    this.closeModal();
  }
}
