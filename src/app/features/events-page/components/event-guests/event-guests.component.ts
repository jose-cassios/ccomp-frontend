import { HttpErrorResponse } from '@angular/common/http';
import { Component, Input, OnChanges, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize, Observable } from 'rxjs';
import { AuthService } from '../../../auth/services/auth.service';
import { apiErrorMessage } from '../../../../core/api/api-error';
import { ApiMessage, apiMessage } from '../../models/event.model';
import { EventGuest, EventGuestsService, GuestInvitation } from '../../services/event-guests.service';
import { EventCoverDirective } from '../event-cover.directive';
import { CertificatesService } from '../../services/certificates.service';
import { autoDismissFeedback } from '../../../../core/ui/feedback-auto-dismiss';

@Component({
  selector: 'app-event-guests', standalone: true,
  imports: [ReactiveFormsModule, DatePipe, RouterLink, EventCoverDirective],
  templateUrl: './event-guests.component.html',
  styleUrl: './event-guests.component.css',
})
export class EventGuestsComponent implements OnChanges {
  @Input({ required: true }) eventId!: number;
  @Input() activityId?: number;
  @Input() manage = false;
  @Input() canView = false;
  @Input() eventFinished = false;
  private readonly service = inject(EventGuestsService);
  readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  readonly form = this.fb.nonNullable.group({ email: ['', [Validators.required, Validators.email]] });
  readonly accessDenied = signal(false);
  readonly guests = signal<EventGuest[]>([]);
  readonly guestSearch = signal('');
  readonly filteredGuests = computed(() => {
    const query = this.guestSearch().trim().toLocaleLowerCase('pt-BR');
    return this.guests().filter(guest => !query || `${guest.name ?? ''} ${guest.email ?? ''}`.toLocaleLowerCase('pt-BR').includes(query));
  });
  readonly invitations = signal<GuestInvitation[]>([]);
  readonly guestCursor = signal<string | null>(null);
  readonly invitationCursor = signal<string | null>(null);
  readonly loading = signal(false);
  readonly invitationsLoading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly filter = this.fb.nonNullable.control('', Validators.email);
  readonly certificateBusyId = signal<number | null>(null);
  readonly certificateApi = inject(CertificatesService);
  private readonly feedback = autoDismissFeedback(this.error, this.message, () => { this.error.set(''); this.message.set(''); });
  readonly statusLabels: Record<string, string> = {
    PENDING: 'Pendente', ACCEPTED: 'Aceito', DECLINED: 'Recusado', CANCELLED: 'Cancelado',
  };
  ngOnChanges() {
    this.accessDenied.set(false);
    if (this.canView || this.manage) this.loadGuests(); else this.guests.set([]);
    if (this.manage && !this.activityId && this.canViewEmail()) this.loadInvitations();
  }
  canViewEmail(): boolean { return this.auth.hasAnyRole(['ADM', 'MODERATOR']); }
  searchGuests(term: string) {
    if (!this.manage || this.loading()) return;
    this.guestSearch.set(term.trim().slice(0, 100));
    this.loading.set(true); this.error.set(''); this.guestCursor.set(null);
    this.service.allGuests(this.eventId, this.activityId).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: rows => { this.accessDenied.set(false); this.guests.set(rows); },
      error: error => this.error.set(apiErrorMessage(error, 'Não foi possível buscar convidados.')),
    });
  }
  issueActivityCertificate(guest: EventGuest) {
    if (!this.manage || !this.eventFinished || guest.status !== 'CONFIRMED' || guest.role !== 'PRESENTER' || this.certificateBusyId() !== null || !this.activityId) return;
    if (!window.confirm(`Emitir o certificado da atividade para ${guest.name || 'este convidado'}?`)) return;
    const guestId = guest.event_guest_id ?? guest.id;
    this.certificateBusyId.set(guestId); this.error.set(''); this.message.set('');
    this.certificateApi.manualInstructor(this.eventId, { activity_id: this.activityId, event_guest_id: guestId })
      .pipe(finalize(() => this.certificateBusyId.set(null))).subscribe({
        next: blob => {
          const url = URL.createObjectURL(blob); const link = document.createElement('a');
          link.href = url; link.download = `certificado-convidado-${guestId}.png`; link.click(); URL.revokeObjectURL(url);
          this.message.set('Certificado emitido e download iniciado.');
        },
        error: error => this.error.set(apiErrorMessage(error, 'Não foi possível emitir o certificado do convidado.')),
      });
  }
  loadGuests(more = false) {
    if (!this.canView && !this.manage) return;
    if (this.loading() || (more && !this.guestCursor())) return;
    this.loading.set(true);
    this.error.set('');
    this.service.guests(this.eventId, more ? this.guestCursor()! : undefined, this.activityId)
      .pipe(finalize(() => this.loading.set(false))).subscribe({
        next: (page) => { this.accessDenied.set(false); this.guests.update((rows) => more ? [...rows, ...page.content] : page.content); this.guestCursor.set(page.next_cursor); },
        error: (e: unknown) => {
          if (e instanceof HttpErrorResponse && [401, 403].includes(e.status)) {
            this.accessDenied.set(true); this.guests.set([]); this.error.set('');
          } else this.error.set(apiErrorMessage(e, 'Falha ao consultar convidados. Tente novamente.'));
        },
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
      (response) => apiMessage(response, 'Convite enviado.'), () => {
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
    this.mutate(this.service.update(this.eventId, guest.event_guest_id ?? guest.id, payload), 'Preferências atualizadas.', () => this.loadGuests());
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
