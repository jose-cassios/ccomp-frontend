import { Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { EventCheckInService } from '../../services/event-check-in.service';
import { AuthService } from '../../../auth/services/auth.service';

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `
    <main>
      <span class="eyebrow">Credenciamento</span>
      <h1>Confirme sua presença</h1>
      @if (!valid) {
        <p role="alert">Este link está incompleto ou inválido. Leia novamente o QR Code apresentado pela organização.</p>
      } @else if (done()) {
        <p class="success" role="status">Presença confirmada com sucesso!</p>
        <p>Seu credenciamento nesta atividade foi registrado.</p>
      } @else {
        <p>Você está confirmando a presença na atividade #{{ activityId }} como <strong>{{ user()?.name || user()?.email }}</strong>.</p>
        <p>É necessário estar inscrito na atividade e confirmar durante o horário em que ela acontece.</p>
        @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
        <button type="button" [disabled]="busy()" (click)="confirm()">
          @if (busy()) { <span class="mini-spinner" aria-hidden="true"></span> }
          {{ busy() ? 'Confirmando presença…' : 'Confirmar minha presença' }}
        </button>
      }
      <a routerLink="/eventos">Voltar aos eventos</a>
    </main>
  `,
  styles: `
    main { max-width:36rem; margin:clamp(1rem,5vw,4rem) auto; padding:clamp(1rem,4vw,2rem); background:var(--surface-card); border:1px solid var(--border-primary); border-radius:1rem }
    .eyebrow { color:var(--brand-600); font-size:.8rem; font-weight:700 }
    h1 { margin:.5rem 0 1rem; font-size:1.6rem; color:var(--text-strong) }
    p { margin:1rem 0; line-height:1.6; overflow-wrap:anywhere; color:var(--text-secondary) }
    button { display:flex; align-items:center; justify-content:center; gap:.5rem; width:100%; padding:.85rem; border:0; border-radius:.5rem; background:var(--brand-600); color:white; font:inherit; cursor:pointer }
    button:disabled { opacity:.6; cursor:wait } a { display:inline-block; margin-top:1rem; color:var(--brand-700) }
    .error { color:var(--danger-text); background:var(--danger-bg); padding:.75rem; border-radius:.5rem }
    .success { font-weight:700; color:var(--brand-700); background:var(--brand-50); padding:.75rem; border-radius:.5rem }
  `,
})
export class ActivityCheckInPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(EventCheckInService);
  private readonly destroyRef = inject(DestroyRef);
  readonly user = inject(AuthService).currentUserState;
  readonly code = this.route.snapshot.queryParamMap.get('code')?.trim() ?? '';
  private readonly rawActivityId = this.route.snapshot.queryParamMap.get('activity_id') ?? '';
  readonly activityId = Number(this.rawActivityId);
  readonly valid = /^\d+$/.test(this.rawActivityId) && Number.isSafeInteger(this.activityId) && this.activityId > 0
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(this.code);
  readonly busy = signal(false);
  readonly done = signal(false);
  readonly error = signal('');

  confirm(): void {
    if (!this.valid || this.busy() || this.done()) return;
    this.busy.set(true);
    this.error.set('');
    this.service.confirm(this.activityId, this.code).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.busy.set(false)),
    ).subscribe({
      next: () => this.done.set(true),
      error: (error: unknown) => {
        const status = error instanceof HttpErrorResponse ? error.status : 0;
        this.error.set(status === 400 || status === 404
          ? 'Não foi possível confirmar. Verifique se você está inscrito nesta atividade, se ela está em andamento e se o QR Code é o atual.'
          : status === 401 || status === 403
            ? 'Sua sessão não permitiu confirmar a presença. Entre novamente com a conta usada na inscrição.'
            : 'Não foi possível confirmar a presença agora. Tente novamente.');
      },
    });
  }
}
