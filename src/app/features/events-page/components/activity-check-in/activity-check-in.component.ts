import { Component, DestroyRef, Input, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { EventCheckInService } from '../../services/event-check-in.service';

@Component({
  selector: 'app-activity-check-in',
  standalone: true,
  template: `
    <section aria-label="Credenciamento da atividade">
      <button type="button" [disabled]="busy()" (click)="generate()">
        @if (busy()) { <span class="mini-spinner" aria-hidden="true"></span> }
        {{ qrUrl() ? 'Recarregar QR Code de presença' : 'Exibir QR Code de presença' }}
      </button>
      @if (error()) { <p role="alert">{{ error() }}</p> }
      @if (qrUrl(); as url) {
        <figure>
          <img [src]="url" alt="QR Code para confirmar presença nesta atividade" width="240" height="240" />
          <figcaption>Apresente este código aos participantes durante a atividade. Cada pessoa deve abrir o link com sua conta e confirmar a presença.</figcaption>
          <a [href]="url" [download]="'presenca-atividade-' + activityId + '.png'">Baixar QR Code</a>
          <button type="button" (click)="close()">Ocultar</button>
        </figure>
      }
    </section>
  `,
  styles: `
    :host { display:block; margin-top:1rem }
    section { border-top:1px solid var(--border-subtle); padding-top:1rem }
    button,a { display:inline-flex; align-items:center; gap:.5rem; padding:.65rem .85rem; border:1px solid var(--border-primary); border-radius:.5rem; background:var(--surface-card); color:var(--brand-700); cursor:pointer; font:inherit }
    button:disabled { opacity:.6; cursor:wait }
    figure { margin:1rem 0 0; padding:1rem; border-radius:.75rem; background:var(--surface-subtle); text-align:center }
    img { display:block; margin:auto; max-width:100%; height:auto; background:white }
    figcaption { max-width:32rem; margin:.75rem auto; line-height:1.5; color:var(--text-secondary) }
    figure button { margin:.5rem } p { margin:.75rem 0; color:var(--danger-text) }
  `,
})
export class ActivityCheckInComponent {
  @Input({ required: true }) activityId!: number;
  private readonly service = inject(EventCheckInService);
  private readonly destroyRef = inject(DestroyRef);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly qrUrl = signal<string | null>(null);

  constructor() {
    this.destroyRef.onDestroy(() => this.close());
  }

  generate(): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.service.getQrCode(this.activityId).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.busy.set(false)),
    ).subscribe({
      next: (image) => {
        if (!image.size || image.type !== 'image/png') {
          this.error.set('Não foi possível obter a imagem do QR Code. Tente novamente.');
          return;
        }
        this.close();
        this.qrUrl.set(URL.createObjectURL(image));
      },
      error: (error: unknown) => this.error.set(error instanceof HttpErrorResponse && error.status === 403
        ? 'Somente o criador ou um editor ativo pode gerar o QR Code desta atividade.'
        : 'Não foi possível carregar o QR Code. Tente novamente.'),
    });
  }

  close(): void {
    const url = this.qrUrl();
    if (url) URL.revokeObjectURL(url);
    this.qrUrl.set(null);
  }
}
