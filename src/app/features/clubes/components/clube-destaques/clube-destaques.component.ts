import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

interface ClubeDestaque{
  categoria: string;
  titulo: string;
  descricao: string;
  imagem: string;
  horario: string;
}

@Component({
  selector: 'app-clube-destaques',
  imports: [CommonModule],
  templateUrl: './clube-destaques.component.html',
  styleUrl: './clube-destaques.component.css',
})
export class ClubeDestaquesComponent {

    clubes: ClubeDestaque[] = [
    {
      categoria: 'ROBÓTICA',
      titulo: 'Clube de Robótica',
      descricao: 'Trazendo vida ao metal através de engenharia e visão elegantes.',
      imagem: '/img1.png',
      horario: 'Encontros às terças, 18h',
    },
    {
      categoria: 'PROGRAMAÇÃO',
      titulo: 'Code Club',
      descricao: 'A espinha dorsal arquitetônica de cada sonho digital construído em equipe.',
      imagem: '/img2.png',
      horario: 'Encontros às quartas, 18h',
    },
    {
      categoria: 'DIVERSIDADE',
      titulo: 'Bits de Ada',
      descricao: 'Coletivo de mulheres na computação promovendo mentoria e projetos.',
      imagem: '/img3.png',
      horario: 'Encontros às quintas, 18h',
    },
  ];
}
