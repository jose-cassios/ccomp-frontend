import { Component, DestroyRef, afterNextRender, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { EVENTOS, type EventoItem } from '../../../events-page/data/eventos.mock';

const INTERVALO_AUTOPLAY = 6000;

@Component({
  selector: 'app-eventos-andamento',
  standalone: true,
  templateUrl: './eventos-andamento.component.html',
  styleUrl: './eventos-andamento.component.css',
})
export class EventosAndamentoComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  currentIndex = signal(0);
  autoplayPausado = signal(false);

  eventos: EventoItem[] = EVENTOS;

  // Distância de cada evento até o atual pelo caminho mais curto do círculo:
  // -1 (esquerda), 0 (centro), 1 (direita) e null para quem fica fora do deck.
  private posicoes = computed(() => {
    const total = this.eventos.length;
    const atual = this.currentIndex();

    return this.eventos.map((_, i) => {
      let distancia = i - atual;

      if (distancia > total / 2) {
        distancia -= total;
      } else if (distancia < -total / 2) {
        distancia += total;
      }

      return Math.abs(distancia) <= 1 ? distancia : null;
    });
  });

  posicao(index: number): number | null {
    return this.posicoes()[index];
  }

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

  // Cards laterais são `inert`: o primeiro clique só traz a carta para o centro.
  // Já no card central, o clique abre a página do evento.
  aoClicarNoCard(index: number) {
    if (this.posicao(index) !== 0) {
      this.goTo(index);
      return;
    }

    this.router.navigate(['/eventos', this.eventos[index].id]);
  }
}
