import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { NewsletterClubesComponent } from '../newsletter-clubes/newsletter-clubes.component';
import { CATEGORIAS_CLUBES, CLUBES } from '../../data/clubes.mock';
import { Categoria, Clube } from '../../models/clube.model';

@Component({
  selector: 'app-todos-clubes',
  imports: [CommonModule, NewsletterClubesComponent ],
  templateUrl: './todos-clubes.component.html',
  styleUrl: './todos-clubes.component.css',
})
export class TodosClubesComponent {

  @ViewChild('ordenarWrapper') ordenarWrapper?: ElementRef<HTMLElement>;

    categoriaAtiva = 'Geral';
  ordenacao = 'Recentes';
  menuOrdenacaoAberto = false;
  opcoesOrdenacao = ['Recentes', 'A-Z', 'Z-A'];
  paginaAtual = 1;
  itensPorPagina = 4;
  categorias: Categoria[] = CATEGORIAS_CLUBES;

  clubes: Clube[] = CLUBES;

  get clubesFiltrados(): Clube[]{
    const filtrados = this.categoriaAtiva === 'Geral'
      ? [...this.clubes]
      : this.clubes.filter(
          (c) => c.categoria.toLocaleLowerCase() === this.categoriaAtiva.toLocaleLowerCase()
        );

    if(this.ordenacao === 'A-Z'){
      return filtrados.sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));
    }
    if(this.ordenacao === 'Z-A'){
      return filtrados.sort((a, b) => b.titulo.localeCompare(a.titulo, 'pt-BR'));
    }
    return filtrados;
  }

  get totalPaginas(): number{
    return Math.ceil(this.clubesFiltrados.length / this.itensPorPagina);
  }

  get clubesPaginados(): Clube[]{
    const inicio = (this.paginaAtual - 1)* this.itensPorPagina;
    return this.clubesFiltrados.slice(inicio, inicio+this.itensPorPagina);
  }

  get paginas(): number[]{
    return Array.from({length: this.totalPaginas}, (_,i)=> i+1);
  }

  toggleMenuOrdenacao(): void{
    this.menuOrdenacaoAberto = !this.menuOrdenacaoAberto;
  }

  @HostListener('document:click', ['$event.target'])
  fecharMenuAoClicarFora(alvo: EventTarget | null): void{
    if(this.menuOrdenacaoAberto && !this.ordenarWrapper?.nativeElement.contains(alvo as Node)){
      this.menuOrdenacaoAberto = false;
    }
  }

  selecionarOrdenacao(opcao: string): void{
    this.ordenacao = opcao;
    this.menuOrdenacaoAberto = false;
    this.paginaAtual = 1;
  }

  selecionarCategoria(nome:string): void{
    this.categoriaAtiva = nome;
    this.paginaAtual = 1;
  }

  isParaPagina(pagina: number): void{
    if(pagina >= 1 && pagina <= this.totalPaginas){
      this.paginaAtual = pagina;
    }
  }

  getIniciais(nome: string):string{
    return nome.split(' ').map((p) =>p[0]).slice(0, 2).join('').toLocaleUpperCase();
  }

}
