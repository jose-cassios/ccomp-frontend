import { Component, DestroyRef, afterNextRender, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface Clube {
  id: number;
  categoria: string;
  nome: string;
  descricao: string;
  imagem: string;
  chamada: string;
  link: string;
}

const INTERVALO_AUTOPLAY = 6000;

@Component({
  selector: 'app-noticias-clube',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './noticias-clube.component.html',
  styleUrl: './noticias-clube.component.css',
})
export class NoticiasClubeComponent {
  private readonly destroyRef = inject(DestroyRef);

  readonly labelSessao = 'Clubes';

  currentIndex = signal(0);
  autoplayPausado = signal(false);

  clubes: Clube[] = [
    {
      id: 1,
      categoria: 'ESTRATÉGIA',
      nome: 'Clube de Jogos',
      descricao:
        'Estratégia, lógica e foco. Organizamos torneios semanais e sessões de estudo de táticas avançadas para mentes competitivas.',
      imagem: '/Container.png',
      chamada: 'Estão abertas as inscrições para o Clube de Jogos!',
      link: '/clubes/jogos',
    },
    {
      id: 2,
      categoria: 'DESENVOLVIMENTO',
      nome: 'Clube de Programação',
      descricao:
        'Encontros práticos de algoritmos e desafios de código. Preparação para maratonas e projetos colaborativos entre os períodos.',
      imagem: '/img1.png',
      chamada: 'Treine para as maratonas com o Clube de Programação',
      link: '/clubes/programacao',
    },
    {
      id: 3,
      categoria: 'PESQUISA',
      nome: 'Clube de Robótica',
      descricao:
        'Da prototipagem à competição: montagem de robôs, automação e integração de sensores em projetos do laboratório.',
      imagem: '/img2.png',
      chamada: 'Construa seu primeiro robô no Clube de Robótica',
      link: '/clubes/robotica',
    },
  ];

  // texto lateral acompanha o card ativo do carrossel
  clubeAtual = computed(() => this.clubes[this.currentIndex()]);

  constructor() {
    // O timer só existe no browser: no SSR ele nunca dispararia change detection
    // e ainda manteria o processo de renderização vivo.
    afterNextRender(() => {
      const timer = setInterval(() => {
        if (!this.autoplayPausado()) {
          this.next();
        }
      }, INTERVALO_AUTOPLAY);

      this.destroyRef.onDestroy(() => clearInterval(timer));
    });
  }

  next() {
    this.currentIndex.update((i) => (i === this.clubes.length - 1 ? 0 : i + 1));
  }

  goTo(index: number) {
    this.currentIndex.set(index);
  }
}
