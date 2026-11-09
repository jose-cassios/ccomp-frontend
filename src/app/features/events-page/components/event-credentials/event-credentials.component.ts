import { Component, Input, OnInit, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, Observable } from 'rxjs';
import { EventCredentialsService, CredentialSearchItem, CredentialSummary } from '../../services/event-credentials.service';
import { apiErrorMessage } from '../../../../core/api/api-error';
import { autoDismissFeedback } from '../../../../core/ui/feedback-auto-dismiss';

@Component({
  selector: 'app-event-credentials', standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './event-credentials.component.html',
  styleUrl: './event-credentials.component.css',
})
export class EventCredentialsComponent implements OnInit {
  @Input({ required: true }) eventId!: number;
  @Input() manage = false;
  private readonly api = inject(EventCredentialsService);
  private readonly destroy = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  readonly term = this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]);
  readonly station = this.fb.nonNullable.control('Recepção 1', [Validators.required, Validators.maxLength(50)]);
  readonly operator = this.fb.nonNullable.control('', [Validators.required, Validators.pattern(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)]);
  readonly summary = signal<CredentialSummary | null>(null);
  readonly rows = signal<CredentialSearchItem[]>([]);
  readonly searched = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly busy = signal(false);
  readonly loading = signal(false);
  private readonly dismissFeedback = autoDismissFeedback(this.error, this.message, () => {
    this.error.set(''); this.message.set('');
  });

  ngOnInit(): void { this.loadSummary(); }

  loadSummary(): void {
    if (this.loading()) return;
    this.loading.set(true); this.error.set('');
    this.api.summary(this.eventId).pipe(
      takeUntilDestroyed(this.destroy), finalize(() => this.loading.set(false)),
    ).subscribe({
      next: total => this.summary.set(total),
      error: e => {
        this.summary.set(null);
        this.error.set(apiErrorMessage(e, 'Sem acesso ao credenciamento ou serviço indisponível.'));
      },
    });
  }

  search(): void {
    if (this.busy()) return;
    if (this.term.invalid || this.term.value.trim().length < 2) {
      this.error.set('Informe pelo menos 2 caracteres para buscar.'); return;
    }
    this.busy.set(true); this.error.set(''); this.message.set('');
    this.rows.set([]); this.searched.set(false);
    this.api.search(this.eventId, this.term.value).pipe(
      takeUntilDestroyed(this.destroy), finalize(() => this.busy.set(false)),
    ).subscribe({
      next: rows => { this.rows.set(rows); this.searched.set(true); },
      error: e => this.error.set(apiErrorMessage(e, 'Não foi possível buscar inscrições.')),
    });
  }

  confirm(row: CredentialSearchItem): void {
    if (this.busy() || !row.eligible || row.credentialed) return;
    if (this.station.invalid || !this.station.value.trim()) {
      this.error.set('Informe a estação de atendimento.'); return;
    }
    if (!window.confirm('Confirmar credenciamento de ' + row.enrollment.user.name + '?')) return;
    this.run(this.api.credential(this.eventId, row.enrollment.id, this.station.value), () => {
      this.message.set('Credenciamento confirmado.');
      this.rows.update(rows => rows.map(r => r.enrollment.id === row.enrollment.id ? { ...r, credentialed: true } : r));
      this.loadSummary();
    });
  }

  changeOperator(add: boolean): void {
    if (this.busy() || !this.manage) return;
    if (this.operator.invalid) {
      this.error.set('Informe o UUID válido da conta.'); return;
    }
    if (!window.confirm((add ? 'Autorizar' : 'Revogar') + ' acesso operacional desta conta?')) return;
    const request = add
      ? this.api.addOperator(this.eventId, this.operator.value)
      : this.api.removeOperator(this.eventId, this.operator.value);
    this.run(request, () => {
      this.message.set(add ? 'Operador autorizado.' : 'Acesso revogado.');
      this.operator.reset();
    });
  }

  private run(request: Observable<unknown>, done: () => void): void {
    if (this.busy()) return;
    this.busy.set(true); this.error.set(''); this.message.set('');
    request.pipe(takeUntilDestroyed(this.destroy), finalize(() => this.busy.set(false))).subscribe({
      next: done,
      error: e => this.error.set(apiErrorMessage(e, 'Não foi possível concluir.')),
    });
  }
}
