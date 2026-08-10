import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-news-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './news-sidebar.component.html',
  styleUrl: './news-sidebar.component.css'
})
export class NewsSidebarComponent {
  categorias = [
    { nome: 'Todas', count: 12 },
    { nome: 'Eventos', count: 4 },
    { nome: 'Projetos', count: 3 },
    { nome: 'Clubes', count: 3 },
    { nome: 'Comunidade', count: 2 }
  ];

  categoriaAtiva = 'Todas';

  selecionarCategoria(nome: string): void {
    this.categoriaAtiva = nome;
  }
}
