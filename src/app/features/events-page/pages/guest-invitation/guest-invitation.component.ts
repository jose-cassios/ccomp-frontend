import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { EventGuestsService } from '../../services/event-guests.service';
import { apiErrorMessage } from '../../../../core/api/api-error';
import { apiMessage } from '../../models/event.model';

@Component({
  standalone: true, imports: [RouterLink],
  template: `
    <main>
      <h1>Convite para participar do evento</h1>
      <p>Use a conta do e-mail que recebeu o convite. Este convite é de convidado, não de editor.</p>
      @if (!valid) { <p role="alert">Link inválido ou incompleto. Solicite um novo convite à organização.</p> }
      @else if (!done()) {
        <button type="button" [disabled]="busy()" (click)="reply(true)">Aceitar convite</button>
        <button type="button" [disabled]="busy()" (click)="reply(false)">Recusar convite</button>
      }
      @if (busy()) { <p role="status"><span class="mini-spinner"></span> Processando convite…</p> }
      @if (error()) { <p role="alert">{{ error() }}</p> }
      @if (message()) { <p role="status">{{ message() }}</p> }
      <a routerLink="/eventos">Ver eventos</a>
    </main>
  `,
  styles: `main { max-width:38rem; margin:3rem auto; padding:1.5rem; border:1px solid var(--border-subtle); border-radius:1rem; background:var(--surface-card) } h1 { font-size:1.5rem } p { margin:1rem 0; line-height:1.6 } button,a { display:inline-block; margin:.5rem .5rem .5rem 0; padding:.75rem; color:var(--brand-700); border:1px solid var(--border-subtle); border-radius:.5rem; background:var(--surface-card); cursor:pointer }`,
})
export class GuestInvitationComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(EventGuestsService);
  readonly code = this.route.snapshot.queryParamMap.get('code')?.trim() ?? '';
  readonly valid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(this.code);
  readonly busy = signal(false);
  readonly done = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  reply(accept: boolean) {
    if (!this.valid || this.busy() || this.done()) return;
    this.busy.set(true); this.error.set('');
    this.service.reply(this.code, accept).pipe(finalize(() => this.busy.set(false))).subscribe({
      next: (result) => { this.done.set(true); this.message.set(apiMessage(result, accept ? 'Convite aceito.' : 'Convite recusado.')); },
      error: (e: unknown) => this.error.set(apiErrorMessage(e, 'Não foi possível responder. Confira se está na conta convidada e se o convite ainda é válido.')),
    });
  }
}
