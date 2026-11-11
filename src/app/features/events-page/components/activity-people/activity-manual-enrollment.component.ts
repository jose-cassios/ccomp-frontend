import { Component, DestroyRef, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { EventsService } from '../../services/events.service';
import { CredentialSearchItem, EventCredentialsService } from '../../services/event-credentials.service';
import { apiErrorMessage } from '../../../../core/api/api-error';
import { apiMessage } from '../../models/event.model';
import { autoDismissFeedback } from '../../../../core/ui/feedback-auto-dismiss';

@Component({
  selector: 'app-activity-manual-enrollment', standalone: true, imports: [ReactiveFormsModule],
  template: `
    <p>Localize uma pessoa já inscrita no evento para adicioná-la a esta atividade.</p>
    <label>Nome ou email
      <input [formControl]="term" maxlength="100" placeholder="Pelo menos 2 caracteres" (keydown.enter)="$event.preventDefault(); search()" />
    </label>
    <button type="button" [disabled]="busy()" (click)="search()">Buscar participante</button>
    @if (busy()) { <p role="status"><span class="mini-spinner" aria-hidden="true"></span> Processando…</p> }
    @if (error()) { <p role="alert">{{ error() }}</p> }
    @if (message()) { <p role="status">{{ message() }}</p> }
    @for (row of results(); track row.enrollment.id) {
      <article>
        <span><strong>{{ row.enrollment.user.name }}</strong><small>{{ row.enrollment.user.email_address }}</small>
          @if (!row.eligible) { <small>Inscrição no evento inativa</small> }
        </span>
        @if (attended().has(row.enrollment.id)) {
          <span>Presença confirmada</span>
        } @else if (added().has(row.enrollment.id)) {
          <div><small>Inscrição confirmada</small><button type="button" [disabled]="busy()" (click)="confirmAttendance(row)">Confirmar presença</button></div>
        } @else {
          <button type="button" [disabled]="busy() || !row.eligible" (click)="enroll(row)">Inscrever na atividade</button>
        }
      </article>
    } @empty { @if (searched()) { <p>Nenhum participante encontrado. Confira a inscrição no evento.</p> } }
    @if (results().length >= 20) { <small>Mostrando até 20 resultados. Refine a busca pelo email.</small> }
  `,
  styles: `:host{display:block;min-width:0;padding:.75rem 0}label{display:grid;gap:.4rem}input{box-sizing:border-box;width:100%;min-width:0;border:1px solid var(--border-primary);border-radius:.5rem;padding:.65rem;font:inherit}button{font:inherit;color:var(--brand-700);background:var(--brand-50);border:1px solid var(--brand-border);border-radius:.5rem;padding:.6rem;cursor:pointer;margin:.4rem 0}button:disabled{opacity:.6;cursor:default}article{display:flex;align-items:center;justify-content:space-between;gap:.75rem;border-bottom:1px solid var(--border-primary);padding:.5rem 0}article span{min-width:0;overflow-wrap:anywhere}small{display:block;color:var(--text-secondary)}[role=alert]{color:var(--danger-text)}@media(max-width:600px){article{align-items:stretch;flex-direction:column;gap:.25rem}input{font-size:1rem}}`,
})
export class ActivityManualEnrollmentComponent {
  @Input({ required: true }) eventId!: number;
  @Input({ required: true }) activityId!: number;
  @Input() manage = false;
  @Output() changed = new EventEmitter<void>();
  private readonly api = inject(EventsService);
  private readonly lookup = inject(EventCredentialsService);
  private readonly destroy = inject(DestroyRef);
  readonly term = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] });
  readonly results = signal<CredentialSearchItem[]>([]);
  readonly busy = signal(false);
  readonly searched = signal(false);
  readonly added = signal<ReadonlySet<number>>(new Set());
  readonly attended = signal<ReadonlySet<number>>(new Set());
  readonly error = signal('');
  readonly message = signal('');
  private readonly feedback = autoDismissFeedback(this.error, this.message, () => { this.error.set(''); this.message.set(''); });

  search(): void {
    if (!this.manage || this.busy()) return;
    if (this.term.invalid || this.term.value.trim().length < 2) { this.error.set('Informe pelo menos 2 caracteres.'); return; }
    this.busy.set(true); this.error.set(''); this.message.set(''); this.results.set([]); this.searched.set(false);
    this.lookup.search(this.eventId, this.term.value).pipe(takeUntilDestroyed(this.destroy), finalize(() => this.busy.set(false))).subscribe({
      next: rows => { this.results.set(rows); this.searched.set(true); },
      error: error => this.error.set(apiErrorMessage(error, 'Não foi possível consultar os inscritos do evento.')),
    });
  }

  confirmAttendance(row: CredentialSearchItem): void {
    if (!this.manage || this.busy() || !row.eligible || !this.added().has(row.enrollment.id) || this.attended().has(row.enrollment.id)) return;
    if (!window.confirm('Confirmar a presença de ' + row.enrollment.user.name + ' nesta atividade?')) return;
    this.busy.set(true); this.error.set(''); this.message.set('');
    this.api.markActivityAttendance(this.activityId, row.enrollment.id).pipe(takeUntilDestroyed(this.destroy), finalize(() => this.busy.set(false))).subscribe({
      next: response => {
        this.attended.update(ids => new Set([...ids, row.enrollment.id]));
        this.message.set(apiMessage(response, 'Presença confirmada na atividade.')); this.changed.emit();
      },
      error: error => this.error.set(apiErrorMessage(error, 'Não foi possível confirmar a presença.')),
    });
  }

  enroll(row: CredentialSearchItem): void {
    if (!this.manage || this.busy() || !row.eligible || this.added().has(row.enrollment.id)) return;
    if (!window.confirm('Inscrever ' + row.enrollment.user.name + ' nesta atividade?')) return;
    this.busy.set(true); this.error.set(''); this.message.set('');
    this.api.enrollActivityParticipant(this.activityId, row.enrollment.id).pipe(takeUntilDestroyed(this.destroy), finalize(() => this.busy.set(false))).subscribe({
      next: response => {
        this.added.update(ids => new Set([...ids, row.enrollment.id]));
        this.message.set(apiMessage(response, 'Participante inscrito na atividade.')); this.changed.emit();
      },
      error: error => this.error.set(apiErrorMessage(error, 'Não foi possível inscrever. Confira vagas e conflitos de horário.')),
    });
  }
}
