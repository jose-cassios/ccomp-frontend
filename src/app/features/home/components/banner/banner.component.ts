import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Atualizacao {
  id: number;
  tag: string;
  titulo: string;
  descricao: string;
  imagem: string;
  link: string;
  isNovo: boolean;
}

interface StatItem {
  valor: string;
  label: string;
}

@Component({
  selector: 'app-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './banner.component.html',
  styleUrl: './banner.component.css'
})
export class BannerComponent {

  currentIndex = 0; // card

  estatisticas: StatItem[] = [
    { valor: '5', label: 'Eventos abertos' },
    { valor: '12+', label: 'Editais' },
    { valor: '100%', label: 'Sucesso' }
  ];

  // Dados mockados
  atualizacoes: Atualizacao[] = [
    {
      id: 1,
      tag: 'Monitoria',
      titulo: 'Edital Monitoria 2026.1',
      descricao: 'Estão abertas as inscrições para o programa de monitoria remunerada. Vagas para Algoritmos, Estrutura de Dados e Sistemas Operacionais.',
      imagem: '/img1.png',
      link: '#edital',
      isNovo: true
    },
    {
      id: 2,
      tag: 'Pesquisa e Extensão',
      titulo: 'Bolsas PIBIC Liberadas',
      descricao: 'Confira a lista de projetos aprovados para fomento no departamento de Ciência da Computação neste semestre.',
      imagem: '/img2.png',
      link: '#pibic',
      isNovo: true
    },
    {
      id: 3,
      tag: 'Eventos Acadêmicos',
      titulo: 'Semana de Tecnologia',
      descricao: 'Garanta sua vaga nos minicursos e palestras. Inscrições com desconto para alunos matriculados.',
      imagem: 'img3.png',
      link: '#eventos',
      isNovo: true
    }
  ];

  // Navegação
  next() {
    this.currentIndex = (this.currentIndex === this.atualizacoes.length - 1) ? 0 : this.currentIndex + 1;
  }

  prev() {
    this.currentIndex = (this.currentIndex === 0) ? this.atualizacoes.length - 1 : this.currentIndex - 1;
  }

  goTo(index: number) {
    this.currentIndex = index;
  }
}
