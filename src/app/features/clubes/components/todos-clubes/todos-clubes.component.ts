import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { NewsletterClubesComponent } from '../newsletter-clubes/newsletter-clubes.component';

interface Autor{
  nome: string;
  avatar: string;
}

interface Clube{
  id: number;
  categoria: string;
  data: string;
  titulo: string;
  descricao: string;
  imagem: string;
  autor: Autor;
}

interface Categoria{
  nome: string;
}


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
  categorias: Categoria[] = [
    { nome: 'Geral'},
    { nome: 'Robótica' },
    { nome: 'Programação' },
    { nome: 'Idiomas' },
    { nome: 'Pesquisa' },
  ];

  clubes: Clube[] = [
    {
      id: 1,
      categoria: 'IDIOMAS',
      data: 'Outubro 18, 2024',
      titulo: 'Clube de Inglês — Conversação sem medo',
      descricao: 'Um espaço para a prática de conversação do idioma sem medo, com dinâmicas semanais e rodadas temáticas guiadas por monitores do curso.',
      imagem: '/img1.png',
      autor: { nome: 'Coordenação de Extensão', avatar: '' },
    },
    {
      id: 2,
      categoria: 'PESQUISA',
      data: 'Outubro 15, 2024',
      titulo: 'Grupo de Estudos em IA aplicada',
      descricao: 'Encontros quinzenais com leitura de papers, reprodução de experimentos e discussões sobre modelos de linguagem e visão computacional.',
      imagem: '/img2.png',
      autor: { nome: 'Núcleo de Tecnologia', avatar: '' },
    },
    {
      id: 3,
      categoria: 'ROBÓTICA',
      data: 'Outubro 12, 2024',
      titulo: 'Equipe de Competição — Robótica IFMA',
      descricao: 'Preparação para torneios regionais e nacionais com foco em projeto mecânico, eletrônica embarcada e programação de estratégias.',
      imagem: '/img3.png',
      autor: { nome: 'Ascom Pesquisa', avatar: '' },
    },
    {
      id: 4,
      categoria: 'PROGRAMAÇÃO',
      data: 'Outubro 10, 2024',
      titulo: 'Maratona de Programação — Treinos Semanais',
      descricao: 'Sessões de resolução de problemas com foco em algoritmos, estruturas de dados e preparação para competições regionais.',
      imagem: '/img1.png',
      autor: { nome: 'Coordenação de Curso', avatar: '' },
    },
    {
      id: 5,
      categoria: 'IDIOMAS',
      data: 'Outubro 08, 2024',
      titulo: 'Clube de Espanhol — Hablemos Juntos',
      descricao: 'Prática de conversação em espanhol com dinâmicas temáticas, músicas e filmes para imersão cultural.',
      imagem: '/img2.png',
      autor: { nome: 'Coordenação de Extensão', avatar: '' },
    },
  ];

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
