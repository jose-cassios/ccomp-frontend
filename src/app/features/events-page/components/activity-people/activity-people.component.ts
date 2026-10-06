import { Component, Input, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { EventsService } from '../../services/events.service';
import { EventEnrollment } from '../../models/event.model';
import { apiErrorMessage } from '../../../../core/api/api-error';
import { EventGuestsComponent } from '../event-guests/event-guests.component';
import { ActivityCheckInComponent } from '../activity-check-in/activity-check-in.component';

@Component({
  selector: 'app-activity-people', standalone: true, imports: [EventGuestsComponent, ActivityCheckInComponent],
  template: `
    <details (toggle)="open = $any($event.target).open">
      <summary>Convidados{{ manage ? ', inscritos e credenciamento' : '' }}</summary>
      @if (open) {
        <app-event-guests [eventId]="eventId" [activityId]="activityId" [manage]="manage" />
        @if (manage) {
          <app-activity-check-in [activityId]="activityId" />
          <button type="button" [disabled]="loading()" (click)="load()">Consultar inscritos da atividade</button>
          @if (loading()) { <p role="status"><span class="mini-spinner"></span> Carregando inscritos…</p> }
          @if (error()) { <p role="alert">{{ error() }}</p> }
          @for (row of rows(); track row.id) { <p>{{ row.user?.name || 'Participante' }} · {{ row.user?.email_address }}</p> }
          @if (loaded() && !rows().length) { <p>Nenhuma inscrição individual nesta atividade.</p> }
          @if (cursor()) { <button type="button" [disabled]="loading()" (click)="load(true)">Mais inscritos</button> }
        }
      }
    </details>
  `,
  styles: `:host { display:block; margin-top:.75rem; font-size:.85rem } summary, button { cursor:pointer; color:var(--brand-700) } button { padding:.6rem; border:1px solid var(--border-subtle); background:var(--surface-card); border-radius:.5rem } p { margin:.5rem 0; overflow-wrap:anywhere }`,
})
export class ActivityPeopleComponent {
  @Input({ required: true }) eventId!: number;
  @Input({ required: true }) activityId!: number;
  @Input() manage = false;
  open = false;
  readonly rows = signal<EventEnrollment[]>([]);
  readonly cursor = signal<string | null>(null);
  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly error = signal('');
  private readonly service = inject(EventsService);
  load(more = false) {
    if (this.loading() || (more && !this.cursor())) return;
    this.loading.set(true); this.error.set('');
    this.service.getActivityEnrollments(this.activityId, more ? this.cursor()! : undefined)
      .pipe(finalize(() => this.loading.set(false))).subscribe({
        next: (page) => { this.loaded.set(true); this.rows.update((rows) => more ? [...rows, ...page.content] : page.content); this.cursor.set(page.next_cursor); },
        error: (e: unknown) => this.error.set(apiErrorMessage(e, 'Não foi possível consultar inscritos.')),
      });
  }
}
