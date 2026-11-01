import { Component, Input, OnInit, inject, signal, DestroyRef } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivityInstructorsService } from '../../services/activity-instructors.service';

@Component({
  selector: 'app-activity-instructors', standalone: true,
  template: `
    @if (!denied()) {
      <section aria-label="Ministrantes da atividade">
        <h4>Ministrantes / instrutores</h4>
        @if (loading()) { <p role="status">Carregando ministrantes…</p> }
        @if (failed()) { <p role="alert">Não foi possível consultar os ministrantes.</p><button type="button" (click)="load()">Tentar novamente</button> }
        @for (person of people(); track person.id) {
          <p>@if (person.image_url) { <img [src]="person.image_url" [alt]="person.name || 'Ministrante'" /> }{{ person.name || 'Ministrante confirmado (nome ainda não fornecido pela API)' }}</p>
        } @empty { @if (!loading() && !failed()) { <p>Nenhum ministrante confirmado nesta atividade.</p> } }
      </section>
    }
  `,
  styles: `section { margin-block: .75rem; } h4 { font-size: .9rem; } p { margin-block:.5rem; display:flex; align-items:center; gap:.5rem; } img { width:2.5rem; height:2.5rem; border-radius:50%; object-fit:cover; } button { font:inherit; color:var(--brand-700); background:var(--surface-card); border:1px solid var(--border-subtle); padding:.5rem; border-radius:.5rem; }`,
})
export class ActivityInstructorsComponent implements OnInit {
  @Input({ required: true }) eventId!: number;
  @Input({ required: true }) activityId!: number;
  private readonly service = inject(ActivityInstructorsService);
  private readonly destroy = inject(DestroyRef);
  readonly people = signal<{ id: number; name?: string; image_url?: string }[]>([]);
  readonly loading = signal(false);
  readonly failed = signal(false);
  readonly denied = signal(false);
  ngOnInit() { this.load(); }
  load() {
    if (this.loading()) return;
    this.loading.set(true); this.failed.set(false);
    this.service.forActivity(this.eventId, this.activityId).pipe(takeUntilDestroyed(this.destroy), finalize(() => this.loading.set(false))).subscribe({
      next: people => this.people.set(people),
      error: error => error instanceof HttpErrorResponse && [401, 403].includes(error.status) ? this.denied.set(true) : this.failed.set(true),
    });
  }
}
