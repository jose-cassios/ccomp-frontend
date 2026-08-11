import { Component, inject, signal, OnInit } from '@angular/core';
import { BannerComponent } from "./components/banner/banner.component";
import { AgendaMesComponent } from "./components/agenda-mes/agenda-mes.component";
import { EventosAndamentoComponent } from "./components/eventos-andamento/eventos-andamento.component";
import { NoticiasClubeComponent } from "./components/noticias-clube/noticias-clube.component";
import { DestaquesSemana } from "./components/destaques-semana/destaques-semana";
import { NewsService } from '../news-page/services/news.service';
import { NewsItemType } from '../news-page/interface/news.interface';

@Component({
  selector: 'app-home',
  standalone:true,
  imports: [BannerComponent, AgendaMesComponent, EventosAndamentoComponent, DestaquesSemana, NoticiasClubeComponent],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  private newsService = inject(NewsService);
  
  readonly newsItems = signal<NewsItemType[]>([]);

  ngOnInit(): void {
    this.loadFeaturedNews();
  }

  loadFeaturedNews(): void {
    this.newsService.getAll({ featured: true }).subscribe({
      next: (response) => {
        this.newsItems.set(response.content);
      },
      error: (error) => {
        console.error('Erro ao carregar notícias em destaque:', error);
      }
    });
  }
}
