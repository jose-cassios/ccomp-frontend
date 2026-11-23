import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, of, switchMap } from 'rxjs';
import { CertificatesService } from '../../services/certificates.service';
import { EventsService } from '../../services/events.service';
import { EventEnrollment } from '../../models/event.model';
import { eventTimestamp } from '../../models/event-time';
import { apiErrorMessage } from '../../../../core/api/api-error';
import { autoDismissFeedback } from '../../../../core/ui/feedback-auto-dismiss';

/** Manager-only issuance; activity rows identify links, not event enrollments. */
@Component({
  selector: 'app-participant-certificate', standalone: true,
  template: `@if (available()) {
    <button type="button" [disabled]="busy()" [attr.aria-busy]="busy()" (click)="download()">
      @if (busy() && action() === 'download') { <span class="mini-spinner" aria-hidden="true"></span> Gerando… } @else { Emitir certificado }
    </button>
    <button type="button" [disabled]="busy()" [attr.aria-busy]="busy()" (click)="sendEmail()">
      @if (busy() && action() === 'email') { <span class="mini-spinner" aria-hidden="true"></span> Enviando… } @else { Enviar por e-mail }
    </button>
    @if (error()) { <small role="alert">{{ error() }}</small> }
    @if (success()) { <small role="status">{{ success() }}</small> }
  }`,
  styles: `:host{display:block}button{font:inherit;font-size:.85rem;color:var(--brand-700);background:var(--brand-50);border:1px solid var(--border-primary);border-radius:.5rem;padding:.5rem;cursor:pointer}button:disabled{opacity:.6;cursor:wait}small{display:block;max-width:24rem;overflow-wrap:anywhere;margin-top:.35rem}small[role=alert]{color:var(--error)}`,
})
export class ParticipantCertificateComponent {
  readonly eventId = input.required<number>();
  readonly enrollment = input.required<EventEnrollment>();
  readonly activityId = input<number>();
  readonly allowed = input(false);
  readonly endDate = input<string | null>(null);
  readonly timeZone = input<string | null>();
  readonly canceled = input(false);
  readonly eventFinished = input(false);
  readonly busy = signal(false);
  readonly action = signal<'download' | 'email' | null>(null);
  readonly error = signal('');
  readonly success = signal('');
  private readonly api = inject(CertificatesService);
  private readonly events = inject(EventsService);
  private readonly document = inject(DOCUMENT);
  private readonly destroy = inject(DestroyRef);
  private readonly feedback = autoDismissFeedback(this.error, this.success, () => { this.error.set(''); this.success.set(''); });
  private url: string | null = null;
  constructor() { this.destroy.onDestroy(() => { if (this.url) URL.revokeObjectURL(this.url); }); }
  available(): boolean {
    const end = eventTimestamp(this.endDate(), this.timeZone() ?? undefined);
    return this.allowed() && this.eventFinished() && !this.canceled() && this.enrollment().status === 'CHECKED_IN' && Number.isFinite(end) && end <= Date.now();
  }
  download(): void {
    if (!this.available() || this.busy()) return;
    const row = this.enrollment();
    if (this.activityId() && !row.user?.id) return;
    this.busy.set(true); this.action.set('download'); this.error.set(''); this.success.set('');
    this.eventEnrollment(row).pipe(
      switchMap(enrollment => this.api.manualParticipant(this.eventId(), enrollment.id, this.activityId())),
      takeUntilDestroyed(this.destroy), finalize(() => { this.busy.set(false); this.action.set(null); }),
    ).subscribe({
      next: blob => {
        if (this.url) URL.revokeObjectURL(this.url);
        this.url = URL.createObjectURL(blob);
        const link = this.document.createElement('a'); link.href = this.url;
        link.download = `certificado-${this.activityId() ? 'atividade-' + this.activityId() : 'evento-' + this.eventId()}-${row.id}.png`;
        this.document.body.appendChild(link); link.click(); link.remove();
        this.success.set('Certificado gerado. Download iniciado.');
      },
      error: error => this.error.set(apiErrorMessage(error, 'Não foi possível emitir o certificado. Verifique o encerramento e a presença no evento e na atividade.')),
    });
  }
  sendEmail(): void {
    if (!this.available() || this.busy()) return;
    const row = this.enrollment();
    if (this.activityId() && !row.user?.id) return;
    if (typeof window !== 'undefined' && !window.confirm(`Enviar o certificado para ${row.user?.name || 'esta pessoa'} por e-mail?`)) return;
    this.busy.set(true); this.action.set('email'); this.error.set(''); this.success.set('');
    this.eventEnrollment(row).pipe(
      switchMap(enrollment => this.api.emailManualParticipant(this.eventId(), enrollment.id, this.activityId())),
      takeUntilDestroyed(this.destroy), finalize(() => { this.busy.set(false); this.action.set(null); }),
    ).subscribe({
      next: () => this.success.set('Certificado enviado por e-mail.'),
      error: error => this.error.set(apiErrorMessage(error, 'Não foi possível enviar o certificado. Verifique o encerramento e a presença.')),
    });
  }
  private eventEnrollment(row: EventEnrollment) {
    return this.activityId() ? this.events.findEventEnrollment(this.eventId(), row.user!.id) : of(row);
  }
}
