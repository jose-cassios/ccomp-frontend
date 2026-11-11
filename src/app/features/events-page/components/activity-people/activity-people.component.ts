import { ActivityManualEnrollmentComponent } from './activity-manual-enrollment.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { autoDismissFeedback } from '../../../../core/ui/feedback-auto-dismiss';
import { Component, Input, Output, EventEmitter, DestroyRef, inject, signal } from '@angular/core';
import { finalize, switchMap } from 'rxjs';
import { EventsService } from '../../services/events.service';
import { EventEnrollment, eventEnrollmentStateLabel, apiMessage } from '../../models/event.model';
import { apiErrorMessage } from '../../../../core/api/api-error';
import { EventGuestsComponent } from '../event-guests/event-guests.component';
import { ActivityCheckInComponent } from '../activity-check-in/activity-check-in.component';
import { ActivityInstructorsComponent } from './activity-instructors.component';

@Component({
  selector: 'app-activity-people', standalone: true, imports: [ActivityManualEnrollmentComponent, EventGuestsComponent, ActivityCheckInComponent, ActivityInstructorsComponent],
  template: `
    @if (canView || manage || canViewInstructors) {
    <details (toggle)="open = $any($event.target).open">
      <summary>Convidados e ministrantes</summary>
      @if (open) {
        <app-event-guests [eventId]="eventId" [activityId]="activityId" [manage]="manage" [canView]="canView" />
        <app-activity-instructors (activityChanged)="activityChanged.emit()" [manage]="manage" [eventId]="eventId" [activityId]="activityId" />
      }
    </details>
    }
    @if (manage) {
      <div class="management-actions" aria-label="Gerenciar participantes desta atividade">
        <button type="button" class="management-primary" [attr.aria-expanded]="managementOpen() && addOpen" [attr.aria-controls]="'activity-participants-' + activityId" (click)="showManagement(true)">Inscrever participante</button>
        <button type="button" [attr.aria-expanded]="managementOpen()" [attr.aria-controls]="'activity-participants-' + activityId" (click)="showManagement(false)">Inscritos e presenças</button>
      </div>
      @if (managementOpen()) {
      <section class="management-panel" [id]="'activity-participants-' + activityId" [attr.aria-label]="'Participantes de ' + activityTitle">
        <header><strong>{{ activityTitle || 'Participantes da atividade' }}</strong><button type="button" (click)="managementOpen.set(false)">Fechar painel</button></header>
        @if (addOpen) { <app-activity-manual-enrollment [eventId]="eventId" [activityId]="activityId" [manage]="manage" (changed)="enrollmentChanged.emit(); load()" /> }
        <h4>Inscritos nesta atividade</h4>
          @if (message()) { <p role="status">{{ message() }}</p> }
          <button type="button" [disabled]="loading() || attendingId() !== null" (click)="load()">Atualizar inscritos</button>
          @if (loading()) { <p role="status"><span class="mini-spinner"></span> Carregando inscritos…</p> }
          @if (error()) { <p role="alert">{{ error() }}</p> }
          @for (row of rows(); track row.id) {
            <article><div><strong>{{ row.user?.name || 'Participante' }}</strong><small>{{ row.user?.email_address }}</small><small>{{ stateLabel(row.status) }}</small></div>
              @if (row.status === 'CONFIRMED') {
                <button type="button" [disabled]="attendingId() !== null || loading()" (click)="markAttendance(row)">
                  @if (attendingId() === row.id) { <span class="mini-spinner" aria-hidden="true"></span> Registrando… } @else { Confirmar presença }
                </button>
              }
            </article>
          }
          @if (loaded() && !rows().length) { <p>Nenhuma inscrição individual nesta atividade.</p> }
          @if (cursor()) { <button type="button" [disabled]="loading()" (click)="load(true)">Mais inscritos</button> }
      </section>
      }
      <details (toggle)="qrOpen = $any($event.target).open"><summary>Presença por QR Code</summary>@if (qrOpen) { <app-activity-check-in [activityId]="activityId" /> }</details>
    }
  `,
  styles: `.management-actions{display:flex;gap:.5rem;flex-wrap:wrap;margin:.75rem 0}.management-primary{background:var(--brand-50);font-weight:600}.management-panel{border:1px solid var(--border-primary);border-radius:.75rem;padding:.85rem;margin:.5rem 0;background:var(--surface-card);min-width:0}.management-panel header{display:flex;align-items:center;justify-content:space-between;gap:.5rem}.management-panel header strong{overflow-wrap:anywhere;min-width:0}h4{font-size:.85rem;margin:1rem 0 .5rem}@media(max-width:600px){.management-actions button{flex:1 1 140px}.management-panel header{align-items:flex-start;flex-direction:column}}:host { display:block; margin-top:.75rem; font-size:.85rem } summary, button { cursor:pointer; color:var(--brand-700) } button { padding:.6rem; border:1px solid var(--border-subtle); background:var(--surface-card); border-radius:.5rem } article{display:flex;justify-content:space-between;align-items:center;gap:.75rem;padding:.7rem 0;border-bottom:1px solid var(--border-primary)}article div{min-width:0;overflow-wrap:anywhere}small{display:block;color:var(--text-secondary)}@media(max-width:600px){article{align-items:stretch;flex-direction:column}}p { margin:.5rem 0; overflow-wrap:anywhere }`,
})
export class ActivityPeopleComponent {
  @Input({ required: true }) eventId!: number;
  @Input({ required: true }) activityId!: number;
  @Input() manage = false;
  @Input() activityTitle = '';
  readonly managementOpen = signal(false);
  @Input() canView = false;
  @Input() canViewInstructors = false;
  @Output() enrollmentChanged = new EventEmitter<void>();
  @Output() activityChanged = new EventEmitter<void>();
  open = false;
  addOpen = false;
  qrOpen = false;
  readonly stateLabel = eventEnrollmentStateLabel;
  readonly rows = signal<EventEnrollment[]>([]);
  readonly cursor = signal<string | null>(null);
  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly attendingId = signal<number | null>(null);
  private readonly destroy = inject(DestroyRef);
  private readonly feedback = autoDismissFeedback(this.error, this.message, () => { this.error.set(''); this.message.set(''); });
  markAttendance(row: EventEnrollment): void {
    if (!this.manage || this.attendingId() !== null || row.status !== 'CONFIRMED' || !row.user?.id) return;
    if (!window.confirm('Confirmar a presença de ' + row.user.name + ' nesta atividade?')) return;
    this.attendingId.set(row.id); this.error.set(''); this.message.set('');
    this.service.findEventEnrollment(this.eventId, row.user.id).pipe(
      switchMap(enrollment => this.service.markActivityAttendance(this.activityId, enrollment.id)),
      takeUntilDestroyed(this.destroy), finalize(() => this.attendingId.set(null)),
    ).subscribe({
      next: response => {
        this.rows.update(rows => rows.map(item => item.id === row.id ? { ...item, status: 'CHECKED_IN' } : item));
        this.message.set(apiMessage(response, 'Presença confirmada na atividade.')); this.enrollmentChanged.emit();
      },
      error: error => this.error.set(apiErrorMessage(error, 'Não foi possível confirmar a presença.')),
    });
  }
  private readonly service = inject(EventsService);
  showManagement(add: boolean): void {
    if (!this.manage) return;
    this.addOpen = add;
    this.openEnrollments(true);
  }
  openEnrollments(open: boolean): void {
    if (!this.manage) return;
    this.managementOpen.set(open);
    if (open && !this.loaded()) this.load();
  }
  load(more = false) {
    if (!this.manage || this.loading() || (more && !this.cursor())) return;
    this.loading.set(true); this.error.set('');
    this.service.getActivityEnrollments(this.activityId, more ? this.cursor()! : undefined)
      .pipe(takeUntilDestroyed(this.destroy), finalize(() => this.loading.set(false))).subscribe({
        next: (page) => { this.loaded.set(true); this.rows.update((rows) => more ? [...rows, ...page.content] : page.content); this.cursor.set(page.next_cursor); },
        error: (e: unknown) => this.error.set(apiErrorMessage(e, 'Não foi possível consultar inscritos.')),
      });
  }
}
