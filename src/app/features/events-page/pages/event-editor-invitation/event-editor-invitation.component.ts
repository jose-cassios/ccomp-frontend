import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { apiMessage } from '../../models/event.model';
import { EventsService } from '../../services/events.service';
import { apiErrorMessage } from '../../../../core/api/api-error';

@Component({
  selector: 'app-event-editor-invitation',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="invitation-page">
      <section class="invitation-card" aria-live="polite">
        <span class="eyebrow">Equipe do evento</span>
        @if (loading()) {
          <h1>Aceitando convite...</h1>
          <p>Estamos validando seu acesso à edição do evento.</p>
        } @else if (successMessage()) {
          <div class="status-icon status-icon--success" aria-hidden="true">✓</div>
          <h1>Convite aceito</h1>
          <p>{{ successMessage() }}</p>
          <a routerLink="/eventos" class="primary-link">Ver eventos</a>
        } @else {
          <div class="status-icon status-icon--error" aria-hidden="true">!</div>
          <h1>Não foi possível aceitar</h1>
          <p>{{ errorMessage() }}</p>
          <a routerLink="/eventos" class="secondary-link">Voltar para eventos</a>
        }
      </section>
    </main>
  `,
  styles: `
    :host { display: block; }
    .invitation-page { min-height: calc(100vh - 11rem); display: grid; place-items: center; padding: 2rem 1rem; background: #f5f8f6; }
    .invitation-card { width: min(100%, 34rem); padding: clamp(1.5rem, 5vw, 3rem); text-align: center; background: #fff; border: 1px solid #dce6df; border-radius: 1.25rem; box-shadow: 0 1rem 2.5rem rgba(8, 55, 30, .08); }
    .eyebrow { display: block; margin-bottom: .75rem; color: #16763a; font-size: .75rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
    h1 { margin: 0 0 .75rem; color: #102d20; font-size: clamp(1.65rem, 5vw, 2.25rem); }
    p { margin: 0 auto 1.5rem; color: #5d6f65; line-height: 1.6; }
    .status-icon { display: grid; place-items: center; width: 3.25rem; height: 3.25rem; margin: 0 auto 1rem; border-radius: 999px; font-size: 1.5rem; font-weight: 900; }
    .status-icon--success { color: #116b34; background: #e5f5ea; }
    .status-icon--error { color: #a32335; background: #fdebed; }
    a { display: inline-flex; min-height: 2.75rem; align-items: center; justify-content: center; padding: 0 1.25rem; border-radius: .65rem; font-weight: 750; text-decoration: none; }
    .primary-link { color: #fff; background: #168b43; }
    .secondary-link { color: #155d32; border: 1px solid #b8cec0; }
  `,
})
export class EventEditorInvitationComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly eventsService = inject(EventsService);

  readonly loading = signal(true);
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const code = this.route.snapshot.queryParamMap.get('code')?.trim() ?? '';
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(code)) {
      this.loading.set(false);
      this.errorMessage.set('O link de convite é inválido ou está incompleto. Solicite um novo convite ao responsável pelo evento.');
      return;
    }

    this.eventsService.acceptEditorInvitation(code).pipe(
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: (response) => this.successMessage.set(apiMessage(
        response,
        'Seu acesso de editor foi ativado com sucesso.',
      )),
      error: (error: unknown) => this.errorMessage.set(this.getErrorMessage(error)),
    });
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const message = apiErrorMessage(error, '');
      if (message) return message;
      if (error.status === 404) return 'Este convite não existe ou já foi utilizado.';
      if (error.status === 400) return 'Este convite expirou. Solicite um novo convite ao responsável pelo evento.';
    }
    return 'Não foi possível validar o convite agora. Tente novamente mais tarde.';
  }
}
