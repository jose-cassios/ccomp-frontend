import { Component, DestroyRef, afterNextRender, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GlobalHighlight } from '../../models/global-highlight.model';

const AUTOPLAY_INTERVAL = 6000;

@Component({
  selector: 'app-noticias-clube',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './noticias-clube.component.html',
  styleUrl: './noticias-clube.component.css',
})
export class NoticiasClubeComponent {
  private readonly destroyRef = inject(DestroyRef);

  readonly clubs = input<readonly GlobalHighlight[]>([]);
  readonly currentIndex = signal(0);
  readonly autoplayPaused = signal(false);
  readonly currentClub = computed(() => this.clubs()[this.currentIndex()] ?? null);

  constructor() {
    effect(() => {
      if (this.currentIndex() >= this.clubs().length) this.currentIndex.set(0);
    });

    afterNextRender(() => {
      const timer = setInterval(() => {
        if (!this.autoplayPaused()) this.next();
      }, AUTOPLAY_INTERVAL);
      this.destroyRef.onDestroy(() => clearInterval(timer));
    });
  }

  next(): void {
    const length = this.clubs().length;
    if (length > 1) this.currentIndex.update((index) => (index + 1) % length);
  }

  goTo(index: number): void {
    this.currentIndex.set(index);
  }
}
