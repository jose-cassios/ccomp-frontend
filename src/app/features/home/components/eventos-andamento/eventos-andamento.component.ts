import { Component, DestroyRef, afterNextRender, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface DetalheEvento {
  label: string;
  value: string;
}

interface EventoAndamento {
  id: number;
  titulo: string;
  descricao: string;
  imagem: string;
  inscricoesAbertas: boolean;
  modalidade: string;
  link: string;
  detalhes: DetalheEvento[];
}

const INTERVALO_AUTOPLAY = 6000;

@Component({
  selector: 'app-eventos-andamento',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './eventos-andamento.component.html',
  styleUrl: './eventos-andamento.component.css',
})
export class EventosAndamentoComponent {
  private readonly destroyRef = inject(DestroyRef);

  currentIndex = signal(0);
  autoplayPausado = signal(false);

  eventos: EventoAndamento[] = [
    {
      id: 1,
      titulo: 'Hackathon IFMA 2026: Green Solutions',
      descricao:
        'O maior evento de programação do IFMA, focado em sustentabilidade e algoritmos verdes. Traga sua mente criativa para encontrar soluções inovadoras.',
      imagem: '/img2.png',
      inscricoesAbertas: true,
      modalidade: 'PRESENCIAL',
      link: '/eventos',
      detalhes: [
        { label: 'DATA', value: '10-12 Out' },
        { label: 'VAGAS', value: '40 Equipes' },
        { label: 'LOCAL', value: 'Auditório II' },
        { label: 'STATUS', value: 'Disponível' },
      ],
    },
    {
      id: 2,
      titulo: 'Semana de Tecnologia 2026',
      descricao:
        'Uma semana inteira de palestras, minicursos e rodas de conversa com profissionais do mercado e pesquisadores do departamento.',
      imagem: '/img3.png',
      inscricoesAbertas: true,
      modalidade: 'HÍBRIDO',
      link: '/eventos',
      detalhes: [
        { label: 'DATA', value: '18-22 Nov' },
        { label: 'VAGAS', value: '200 Alunos' },
        { label: 'LOCAL', value: 'Bloco de Informática' },
        { label: 'STATUS', value: 'Disponível' },
      ],
    },
    {
      id: 3,
      titulo: 'Maratona de Programação',
      descricao:
        'Etapa regional da maratona: cinco horas de desafios algorítmicos em equipes de três. Treinos abertos toda quinta-feira.',
      imagem: '/img1.png',
      inscricoesAbertas: false,
      modalidade: 'PRESENCIAL',
      link: '/eventos',
      detalhes: [
        { label: 'DATA', value: '05 Dez' },
        { label: 'VAGAS', value: '30 Equipes' },
        { label: 'LOCAL', value: 'Laboratório 3' },
        { label: 'STATUS', value: 'Encerrado' },
      ],
    },
  ];

  eventoAtual = computed(() => this.eventos[this.currentIndex()]);

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
    this.currentIndex.update((i) => (i === this.eventos.length - 1 ? 0 : i + 1));
  }

  prev() {
    this.currentIndex.update((i) => (i === 0 ? this.eventos.length - 1 : i - 1));
  }

  goTo(index: number) {
    this.currentIndex.set(index);
  }
}
