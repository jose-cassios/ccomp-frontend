import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { EventsService } from '../../services/events.service';
import { EventEnrollment, eventEnrollmentStateLabel } from '../../models/event.model';
import { apiErrorMessage } from '../../../../core/api/api-error';
import { EventGuestsComponent } from '../event-guests/event-guests.component';
import { ActivityCheckInComponent } from '../activity-check-in/activity-check-in.component';
import { ActivityInstructorsComponent } from './activity-instructors.component';

@Component({
  selector: 'app-activity-people', standalone: true, imports: [EventGuestsComponent, ActivityCheckInComponent, ActivityInstructorsComponent],
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
      <details (toggle)="openEnrollments($any($event.target).open)">
        <summary>Inscritos da atividade</summary>
          <button type="button" [disabled]="loading()" (click)="load()">Atualizar inscritos</button>
          @if (loading()) { <p role="status"><span class="mini-spinner"></span> Carregando inscritos…</p> }
          @if (error()) { <p role="alert">{{ error() }}</p> }
          @for (row of rows(); track row.id) { <p>{{ row.user?.name || 'Participante' }} · {{ row.user?.email_address }} · {{ stateLabel(row.status) }}</p> }
          @if (loaded() && !rows().length) { <p>Nenhuma inscrição individual nesta atividade.</p> }
          @if (cursor()) { <button type="button" [disabled]="loading()" (click)="load(true)">Mais inscritos</button> }
      </details>
      <details (toggle)="qrOpen = $any($event.target).open"><summary>Presença por QR Code</summary>@if (qrOpen) { <app-activity-check-in [activityId]="activityId" /> }</details>
    }
  `,
  styles: `:host { display:block; margin-top:.75rem; font-size:.85rem } summary, button { cursor:pointer; color:var(--brand-700) } button { padding:.6rem; border:1px solid var(--border-subtle); background:var(--surface-card); border-radius:.5rem } p { margin:.5rem 0; overflow-wrap:anywhere }`,
})
export class ActivityPeopleComponent {
  @Input({ required: true }) eventId!: number;
  @Input({ required: true }) activityId!: number;
  @Input() manage = false;
  @Input() canView = false;
  @Input() canViewInstructors = false;
  @Output() activityChanged = new EventEmitter<void>();
  open = false;
  qrOpen = false;
  readonly stateLabel = eventEnrollmentStateLabel;
  readonly rows = signal<EventEnrollment[]>([]);
  readonly cursor = signal<string | null>(null);
  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly error = signal('');
  private readonly service = inject(EventsService);
  openEnrollments(open: boolean): void { if (open && !this.loaded()) this.load(); }
  load(more = false) {
    if (!this.manage || this.loading() || (more && !this.cursor())) return;
    this.loading.set(true); this.error.set('');
    this.service.getActivityEnrollments(this.activityId, more ? this.cursor()! : undefined)
      .pipe(finalize(() => this.loading.set(false))).subscribe({
        next: (page) => { this.loaded.set(true); this.rows.update((rows) => more ? [...rows, ...page.content] : page.content); this.cursor.set(page.next_cursor); },
        error: (e: unknown) => this.error.set(apiErrorMessage(e, 'Não foi possível consultar inscritos.')),
      });
  }
}
