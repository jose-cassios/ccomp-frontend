import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { encontrarEventoPorId, type EventoItem } from '../data/eventos.mock';

@Component({
  selector: 'app-evento-detalhe',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './evento-detalhe.component.html',
  styleUrl: './evento-detalhe.component.css',
})
export class EventoDetalheComponent {
  private readonly route = inject(ActivatedRoute);

  readonly id = signal<number | null>(null);
  readonly evento = computed<EventoItem | undefined>(() => {
    const id = this.id();
    return id === null ? undefined : encontrarEventoPorId(id);
  });

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));
      this.id.set(Number.isFinite(id) && params.get('id') !== null ? id : null);
    });
  }
}
