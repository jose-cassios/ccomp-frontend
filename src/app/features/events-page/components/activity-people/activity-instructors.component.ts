import { Component, Input, Output, EventEmitter, OnChanges, inject, signal, DestroyRef } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, FormControl, Validators } from '@angular/forms';
import { finalize, Observable } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivityInstructorsService, Instructor } from '../../services/activity-instructors.service';
import { EventsService } from '../../services/events.service';
import { AuthService } from '../../../auth/services/auth.service';
import { apiErrorMessage } from '../../../../core/api/api-error';
import { autoDismissFeedback } from '../../../../core/ui/feedback-auto-dismiss';

@Component({
  selector: 'app-activity-instructors', standalone: true, imports: [ReactiveFormsModule],
  template: `
    @if (!denied()) {
      <section aria-label="Ministrantes da atividade">
        <h4>Ministrantes e auxiliares</h4>
        @if (loading() || busy()) { <p role="status"><span class="mini-spinner"></span> Processando…</p> }
        @if (error()) { <p role="alert">{{ error() }}</p><button type="button" [disabled]="busy()" (click)="load()">Consultar novamente</button> }
        @if (message()) { <p role="status">{{ message() }}</p> }
        @for (person of people(); track person.id) {
          <article><strong>{{ person.name || 'Ministrante' }}</strong><small>{{ person.role === 'ASSISTANT' ? 'Auxiliar' : 'Ministrante' }} · {{ person.status === 'CONFIRMED' ? 'Confirmado' : 'Cancelado' }}</small><p>{{ person.description }}</p>
            @if (manage) {
              <details><summary>Vincular conta</summary><p>Uma conta ativa poderá editar esta atividade, sem convite por email.</p><label>Email<input type="email" [formControl]="accountEmailFor(person.id)" /></label><button type="button" [disabled]="busy()" (click)="link(person)">Vincular conta</button></details>
              <button type="button" [disabled]="busy()" (click)="remove(person)">Excluir desta atividade</button>
            }
            @if (person.user_id && person.user_id === auth.currentUserState()?.id && person.status === 'CONFIRMED') {
              <button type="button" [disabled]="busy()" (click)="editMine()">Editar minha atividade</button>
              <button type="button" [disabled]="busy()" (click)="cancelMine()">Cancelar minha participação como ministrante</button>
            }
          </article>
        } @empty { @if (!loading()) { <p>Nenhum ministrante cadastrado nesta atividade.</p> } }
        @if (editing()) {
          <fieldset [disabled]="busy()"><legend>Conteúdo da minha atividade</legend>
            <label>Título<input [formControl]="activityForm.controls.title" maxlength="255" /></label>
            <label>Descrição<textarea [formControl]="activityForm.controls.description" maxlength="1000" rows="3"></textarea></label>
            <label>Local<input [formControl]="activityForm.controls.location" maxlength="255" /></label>
            <button type="button" (click)="saveMine()">Salvar atividade</button><button type="button" (click)="editing.set(false)">Fechar</button>
          </fieldset>
        }
      </section>
    }
  `,
  styles: `:host { display:block; min-width:0 } section { margin-block:.75rem } h4 { font-size:.9rem } article { padding:12px 0; border-bottom:1px solid var(--border-primary) } small { display:block;color:var(--text-secondary) } p { margin:.5rem 0; overflow-wrap:anywhere } button { font:inherit; color:var(--brand-700); background:var(--surface-card); border:1px solid var(--border-subtle); padding:.6rem; border-radius:.5rem; margin:4px; cursor:pointer } label {display:grid;gap:6px;margin:10px 0} input,textarea {box-sizing:border-box;min-width:0;width:100%;padding:10px;border:1px solid var(--border-primary);border-radius:8px;font:inherit} fieldset {min-width:0;border:1px solid var(--border-primary);padding:12px} summary {cursor:pointer} `,
})
export class ActivityInstructorsComponent implements OnChanges {
  @Input({ required: true }) eventId!: number;
  @Input({ required: true }) activityId!: number;
  @Input() manage = false;
  @Input() revision = 0;
  @Output() activityChanged = new EventEmitter<void>();
  private readonly service = inject(ActivityInstructorsService);
  private readonly events = inject(EventsService);
  private readonly destroy = inject(DestroyRef);
  readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly accountEmails = new Map<number, FormControl<string>>();
  accountEmailFor(id: number): FormControl<string> {
    if (!this.accountEmails.has(id)) this.accountEmails.set(id, this.fb.nonNullable.control('', [Validators.required, Validators.email]));
    return this.accountEmails.get(id)!;
  }
  readonly activityForm = this.fb.nonNullable.group({ title: ['', [Validators.required, Validators.maxLength(255)]], description: ['', Validators.maxLength(1000)], location: ['', Validators.maxLength(255)] });
  readonly editing = signal(false);
  readonly people = signal<Instructor[]>([]);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal(''); readonly message = signal('');
  readonly denied = signal(false);
  private readonly dismissFeedback = autoDismissFeedback(this.error, this.message, () => { this.error.set(''); this.message.set(''); });
  ngOnChanges() { this.load(); }
  load() {
    if (this.loading()) return;
    this.loading.set(true); this.error.set('');
    this.service.forActivity(this.eventId, this.activityId).pipe(takeUntilDestroyed(this.destroy), finalize(() => this.loading.set(false))).subscribe({
      next: people => { this.denied.set(false); this.people.set(people); },
      error: e => e instanceof HttpErrorResponse && [401,403].includes(e.status) ? this.denied.set(true) : this.error.set(apiErrorMessage(e, 'Não foi possível consultar ministrantes.')),
    });
  }
  link(person: Instructor): void {
    if (!this.manage || this.busy()) return;
    const email = this.accountEmailFor(person.id);
    email.markAsTouched();
    if (email.invalid) { this.error.set('Informe um email válido.'); return; }
    this.run(this.service.linkAccount(this.activityId, person.id, email.value), 'Conta vinculada à atividade.', () => email.reset());
  }
  remove(person: Instructor) { if (this.manage && window.confirm('Excluir ' + person.name + ' somente desta atividade?')) this.run(this.service.remove(this.activityId, person.id), 'Ministrante removido desta atividade.'); }
  cancelMine() { if (this.isMine() && window.confirm('Cancelar seu vínculo como ministrante desta atividade?')) this.run(this.service.cancelMine(this.activityId), 'Seu vínculo foi cancelado.'); }
  private isMine() { const id = this.auth.currentUserState()?.id; return !!id && this.people().some(p => p.user_id === id && p.status === 'CONFIRMED'); }
  editMine() {
    if (!this.isMine() || this.busy()) return;
    this.busy.set(true);
    this.events.getAllActivities(this.eventId).pipe(takeUntilDestroyed(this.destroy), finalize(() => this.busy.set(false))).subscribe({
      next: rows => { const row = rows.find(r => r.id === this.activityId); if (row) { this.activityForm.reset({ title: row.title, description: row.description ?? '', location: row.location ?? '' }); this.editing.set(true); } },
      error: e => this.error.set(apiErrorMessage(e, 'Não foi possível carregar a atividade.')),
    });
  }
  saveMine() { this.activityForm.markAllAsTouched(); if (!this.isMine() || this.activityForm.invalid) return; this.run(this.events.updateActivity(this.activityId, this.activityForm.getRawValue()), 'Atividade atualizada.', () => this.activityChanged.emit()); }
  private run(request: Observable<unknown>, message: string, done?: () => void) {
    if (this.busy()) return;
    this.busy.set(true); this.error.set(''); this.message.set('');
    request.pipe(takeUntilDestroyed(this.destroy), finalize(() => this.busy.set(false))).subscribe({ next: () => { this.message.set(message); this.editing.set(false); done?.(); this.load(); }, error: e => this.error.set(apiErrorMessage(e, 'Não foi possível concluir.')) });
  }
}
