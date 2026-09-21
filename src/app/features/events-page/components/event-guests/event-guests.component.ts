import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize, Observable } from 'rxjs';
import { AuthService } from '../../../auth/services/auth.service';
import { apiErrorMessage } from '../../../../core/api/api-error';
import { ApiMessage, apiMessage } from '../../models/event.model';
import { EventGuest, EventGuestsService, GuestInvitation } from '../../services/event-guests.service';

@Component({
  selector: 'app-event-guests', standalone: true,
  imports: [ReactiveFormsModule, DatePipe, RouterLink],
  templateUrl: './event-guests.component.html',
  styleUrl: './event-guests.component.css',
})
export class EventGuestsComponent implements OnInit {
  @Input({ required: true }) eventId!: number;
  @Input() activityId?: number;
  @Input() manage = false;
  private readonly service = inject(EventGuestsService);
  readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  readonly form = this.fb.nonNullable.group({ email: ['', [Validators.required, Validators.email]] });
  readonly guests = signal<EventGuest[]>([]);
  readonly invitations = signal<GuestInvitation[]>([]);
  readonly guestCursor = signal<string | null>(null);
  readonly invitationCursor = signal<string | null>(null);
  readonly loading = signal(false);
  readonly invitationsLoading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly filter = this.fb.nonNullable.control('', Validators.email);
  readonly statusLabels: Record<string, string> = {
    PENDING: 'Pendente', ACCEPTED: 'Aceito', DECLINED: 'Recusado', CANCELLED: 'Cancelado',
  };
  ngOnInit() { this.loadGuests(); if (this.manage && !this.activityId) this.loadInvitations(); }
  loadGuests(more = false) {
    if (this.loading() || (more && !this.guestCursor())) return;
    this.loading.set(true);
    this.error.set('');
    this.service.guests(this.eventId, more ? this.guestCursor()! : undefined, this.activityId)
      .pipe(finalize(() => this.loading.set(false))).subscribe({
        next: (page) => { this.guests.update((rows) => more ? [...rows, ...page.content] : page.content); this.guestCursor.set(page.next_cursor); },
        error: (e: unknown) => this.error.set(apiErrorMessage(e, 'Não foi possível consultar convidados. A API ainda possui restrições de acesso a esta consulta.')),
      });
  }
  loadInvitations(more = false) {
    if (this.invitationsLoading() || this.filter.invalid || (more && !this.invitationCursor())) return;
    this.invitationsLoading.set(true);
    this.error.set('');
    this.service.invitations(this.eventId, this.filter.value, more ? this.invitationCursor()! : undefined)
      .pipe(finalize(() => this.invitationsLoading.set(false))).subscribe({
        next: (page) => { this.invitations.update((rows) => more ? [...rows, ...page.content] : page.content); this.invitationCursor.set(page.next_cursor); },
        error: (e: unknown) => this.error.set(apiErrorMessage(e, 'Não foi possível consultar convites.')),
      });
  }
  invite() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.busy()) return;
    this.mutate(this.service.invite(this.eventId, this.form.controls.email.value),
      (response) => {
        const message = apiMessage(response, 'Convite registrado.');
        return /e-mail.*enviad/i.test(message)
          ? 'Convite registrado. O envio de e-mail depende da implementação do backend; você pode compartilhar o link abaixo.'
          : message;
      }, () => {
        this.form.reset(); this.filter.setValue(''); this.loadInvitations();
      });
  }
  cancel(invitation: GuestInvitation) {
    this.mutate(this.service.cancel(invitation.id), 'Convite cancelado.', () => this.loadInvitations());
  }
  update(guest: EventGuest, field: 'status' | 'visibility') {
    const payload = field === 'status'
      ? { status: guest.status === 'CONFIRMED' ? 'CANCELED' as const : 'CONFIRMED' as const }
      : { visibility: guest.visibility === 'PUBLIC' ? 'PRIVATE' as const : 'PUBLIC' as const };
    this.mutate(this.service.update(this.eventId, guest.id, payload), 'Preferências atualizadas.', () => this.loadGuests());
  }
  canUpdate(guest: EventGuest) { return this.manage || guest.user_id === this.auth.getCurrentUser()?.id; }
  private mutate(request: Observable<ApiMessage>, message: string | ((response: ApiMessage) => string), done: () => void) {
    if (this.busy()) return;
    this.busy.set(true); this.error.set(''); this.message.set('');
    request.pipe(finalize(() => this.busy.set(false))).subscribe({
      next: (response) => { this.message.set(typeof message === 'string' ? message : message(response)); done(); },
      error: (e: unknown) => this.error.set(apiErrorMessage(e, 'Não foi possível concluir a ação.')),
    });
  }
}
