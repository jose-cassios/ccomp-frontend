import { Component, DestroyRef, Input, OnChanges, OnDestroy, Output, EventEmitter, SimpleChanges, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, finalize, of, switchMap, tap } from 'rxjs';
import { EventGuest, EventGuestsService, GuestInvitation, GuestRole, GuestProfile } from '../../services/event-guests.service';
import { EventCoverDirective } from '../event-cover.directive';
import { AuthService } from '../../../auth/services/auth.service';
import { apiErrorMessage } from '../../../../core/api/api-error';
import { ApiMessage, EventActivity, apiMessage } from '../../models/event.model';

@Component({
  selector: 'app-event-guest-manager', standalone: true,
  imports: [ReactiveFormsModule, DatePipe, EventCoverDirective],
  templateUrl: './event-guest-manager.component.html',
  styleUrl: './event-guest-manager.component.css',
})
export class EventGuestManagerComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) eventId!: number;
  @Input() activities: EventActivity[] = [];
  @Input() activityId: number | null = null;
  @Input() disabled = false;
  @Output() busyChange = new EventEmitter<boolean>();
  @Output() dirtyChange = new EventEmitter<boolean>();
  private readonly service = inject(EventGuestsService);
  private readonly destroyRef = inject(DestroyRef);
  readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(255)]],
    description: ['', Validators.maxLength(5000)],
  });
  readonly email = this.fb.nonNullable.control('', [Validators.required, Validators.email]);
  readonly accountEmail = this.fb.nonNullable.control('', Validators.email);
  readonly accountActivity = this.fb.nonNullable.control(0);
  readonly role = this.fb.nonNullable.control<GuestRole>('PRESENTER');
  readonly guests = signal<EventGuest[]>([]);
  readonly linked = signal<EventGuest[]>([]);
  readonly selected = signal<EventGuest | null>(null);
  readonly editing = signal(false);
  readonly listError = signal('');
  readonly pendingPhoto = signal<GuestProfile | null>(null);
  readonly photoCandidates = signal<EventGuest[]>([]);
  private existingGuestIds = new Set<number>();
  readonly cursor = signal<string | null>(null);
  readonly linkedCursor = signal<string | null>(null);
  readonly invitations = signal<GuestInvitation[]>([]);
  readonly invitationCursor = signal<string | null>(null);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly message = signal('');
  readonly error = signal('');
  readonly file = signal<File | null>(null);
  readonly preview = signal('');
  readonly roles: ReadonlyArray<{ value: GuestRole; label: string }> = [
    { value: 'PRESENTER', label: 'Palestrante convidado' }, { value: 'SPECIAL_GUEST', label: 'Convidado especial' },
    { value: 'MODERATOR', label: 'Mediador da atividade' }, { value: 'ASSISTANT', label: 'Auxiliar' }, { value: 'LISTENER', label: 'Ouvinte convidado' },
  ];
  readonly invitationStatus: Record<string, string> = { PENDING: 'Aguardando aceite', ACCEPTED: 'Aceito', DECLINED: 'Recusado', CANCELLED: 'Cancelado' };
  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.reportDirty());
    this.accountEmail.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.reportDirty());
    this.email.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.reportDirty());
    this.role.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.reportDirty());
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['eventId']) this.load();
    if (changes['eventId'] || changes['activityId']) this.loadLinked();
  }
  ngOnDestroy(): void { if (this.preview()) URL.revokeObjectURL(this.preview()); }
  private reportDirty(): void { this.dirtyChange.emit(this.form.dirty || this.accountEmail.dirty || this.email.dirty || this.role.dirty || !!this.file() || !!this.pendingPhoto()); }
  preventImplicitSubmit(event: Event): void {
    // This panel sits inside the activity form. Enter must not submit that form.
    if (event.target instanceof HTMLInputElement && event.target.type !== 'file') event.preventDefault();
  }
  load(more = false): void {
    if (this.loading() || (more && !this.cursor())) return;
    this.loading.set(true); this.listError.set('');
    this.service.guests(this.eventId, more ? this.cursor()! : undefined)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false))).subscribe({
        next: page => {
          this.guests.update(rows => more ? [...rows, ...page.content] : page.content);
          this.cursor.set(page.next_cursor);
        }, error: e => this.listError.set(apiErrorMessage(e, 'Não foi possível carregar os convidados.')),
      });
  }
  loadLinked(more = false): void {
    if (!this.activityId || (more && !this.linkedCursor())) return;
    this.service.guests(this.eventId, more ? this.linkedCursor()! : undefined, this.activityId)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: page => { this.linked.update(rows => more ? [...rows, ...page.content] : page.content); this.linkedCursor.set(page.next_cursor); },
        error: e => this.error.set(apiErrorMessage(e, 'Não foi possível consultar os convidados desta atividade.')),
      });
  }
  choose(id: number): void {
    if (this.busy() || this.disabled || this.pendingPhoto()) return;
    if ((this.form.dirty || this.accountEmail.dirty || this.role.dirty || this.file()) && !window.confirm('Descartar as alterações do convidado?')) return;
    const guest = this.guests().find(row => row.id === id) ?? null;
    this.editing.set(true); this.accountEmail.reset(); this.accountActivity.reset(); this.selected.set(guest); this.clearFile();
    this.form.reset({ name: guest?.name ?? '', description: guest?.description ?? '' });
    this.role.reset(this.linked().find(row => row.event_guest_id === id)?.role ?? 'PRESENTER');
    this.error.set(''); this.message.set(''); this.reportDirty();
  }
  newGuest(): void {
    if (this.busy() || this.disabled || this.pendingPhoto()) return;
    this.choose(0);
  }
  cancelEdit(): void {
    if (this.busy() || this.disabled) return;
    if ((this.form.dirty || this.accountEmail.dirty || this.file() || this.pendingPhoto()) && !window.confirm('Descartar as alterações e a foto pendente? O perfil já cadastrado será mantido.')) return;
    this.finishEditing();
  }
  private finishEditing(): void {
    this.pendingPhoto.set(null); this.photoCandidates.set([]);
    this.selected.set(null); this.form.reset(); this.role.reset(); this.accountEmail.reset(); this.accountActivity.reset();
    this.clearFile(); this.editing.set(false); this.reportDirty();
  }
  save(): void {
    if (this.busy() || this.disabled || this.pendingPhoto()) return;
    this.form.markAllAsTouched();
    this.accountEmail.markAsTouched();
    if (!this.selected() && this.accountEmail.invalid) { this.error.set('Informe um email válido para vincular a conta ou deixe o campo vazio.'); return; }
    if (this.form.invalid) { this.error.set('Informe o nome do convidado (até 255 caracteres) e uma apresentação de até 5.000 caracteres.'); return; }
    const profile = { name: this.form.controls.name.value.trim(), description: this.form.controls.description.value.trim(), ...(!this.selected() && this.accountEmail.value.trim() ? { account_email: this.accountEmail.value.trim() } : {}) };
    const guest = this.selected();
    let profileSaved = false;
    // Snapshot all pages before creating when a photo will need a profile ID.
    const request: Observable<unknown> = guest
      ? (this.form.dirty ? this.service.profile(this.eventId, guest.id, profile) : of<ApiMessage>({})).pipe(tap(() => {
          profileSaved = true; this.selected.set({ ...guest, ...profile }); this.form.reset(profile); this.reportDirty();
        }))
      : (this.file() ? this.service.allGuests(this.eventId) : of<EventGuest[]>([])).pipe(
          tap(rows => this.existingGuestIds = new Set(rows.map(row => row.id))),
          switchMap(() => this.service.create(this.eventId, profile)),
          tap(response => {
            profileSaved = true; this.form.reset(profile);
            // Use an authoritative ID if the API starts returning it; never guess from a name.
            if (Number.isSafeInteger(response.id) && response.id! > 0) {
              this.selected.set({ id: response.id!, ...profile, user_id: '', status: 'CONFIRMED', visibility: 'PUBLIC' });
            } else if (this.file()) this.pendingPhoto.set(profile);
            this.reportDirty();
          }),
        );
    this.setBusy(true); this.error.set(''); this.message.set('');
    request.pipe(
      switchMap(() => this.file() && this.selected()
        ? this.service.uploadImage(this.eventId, this.selected()!.id, this.file()!).pipe(tap(() => this.clearFile()))
        : of<ApiMessage>({})),
      takeUntilDestroyed(this.destroyRef), finalize(() => this.setBusy(false)),
    ).subscribe({
      next: () => {
        if (this.pendingPhoto()) {
          this.message.set('Perfil cadastrado. Confirme abaixo o convidado para concluir o envio da foto.');
          this.findPhotoCandidates();
        } else {
          this.message.set(guest ? 'Convidado atualizado com sucesso.' : 'Convidado cadastrado com sucesso.');
          this.finishEditing(); this.load(); this.loadLinked();
        }
      },
      error: e => {
        this.error.set((profileSaved ? 'O perfil já foi salvo. A foto não foi enviada. ' : '') + apiErrorMessage(e, 'Tente novamente. Seus dados foram mantidos.'));
        if (profileSaved) this.load();
      },
    });
  }
  findPhotoCandidates(): void {
    const profile = this.pendingPhoto(); if (!profile || this.loading()) return;
    this.loading.set(true); this.error.set('');
    this.service.allGuests(this.eventId).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false))).subscribe({
      next: rows => {
        if (this.pendingPhoto() !== profile) return;
        this.photoCandidates.set(rows.filter(row => !this.existingGuestIds.has(row.id)
          && row.name?.trim() === profile.name && (row.description ?? '').trim() === profile.description));
      },
      error: e => this.error.set(apiErrorMessage(e, 'Perfil salvo, mas não foi possível localizá-lo para enviar a foto. Tente novamente; não é necessário cadastrá-lo outra vez.')),
    });
  }
  confirmPhoto(guest: EventGuest): void {
    if (this.busy() || this.disabled || !this.pendingPhoto() || !this.photoCandidates().some(row => row.id === guest.id)) return;
    this.selected.set(guest); this.pendingPhoto.set(null); this.photoCandidates.set([]);
    this.form.reset({ name: guest.name ?? '', description: guest.description ?? '' }); this.reportDirty();
    this.save();
  }
  finishWithoutPhoto(): void {
    if (this.busy() || this.disabled) return;
    this.finishEditing(); this.message.set('Convidado cadastrado sem foto. Você pode adicioná-la em Editar.'); this.load();
  }
  private setBusy(value: boolean): void { this.busy.set(value); this.busyChange.emit(value); }
  removeGuest(): void {
    const guest = this.selected();
    if (!guest || this.busy() || this.disabled || !window.confirm('Excluir ' + guest.name + ' do evento? A foto e todos os vínculos com atividades também serão removidos.')) return;
    this.run(this.service.remove(this.eventId, guest.id), 'Convidado excluído do evento.', () => { this.finishEditing(); this.load(); this.loadLinked(); });
  }
  linkAccount(): void {
    const guest = this.selected(); const activityId = this.activityId ?? this.accountActivity.value;
    this.accountEmail.markAsTouched();
    if (!guest || !activityId || this.accountEmail.invalid || !this.accountEmail.value.trim()) { this.error.set('Informe o email de uma conta ativa e selecione a atividade.'); return; }
    this.run(this.service.linkAccount(this.eventId, guest.id, this.accountEmail.value, activityId), 'Conta vinculada. Ela poderá editar esta atividade enquanto o vínculo estiver confirmado.', () => { this.accountEmail.reset(); this.accountActivity.reset(); this.reportDirty(); this.loadLinked(); });
  }
  selectPhoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0]; input.value = '';
    if (!file || this.busy() || this.disabled) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size === 0 || file.size > 10 * 1024 * 1024) {
      this.error.set('Escolha uma imagem PNG, JPEG ou WebP de até 10 MB.'); return;
    }
    this.clearFile(); this.file.set(file); this.preview.set(URL.createObjectURL(file)); this.error.set(''); this.reportDirty();
  }
  clearFile(): void {
    if (this.preview()) URL.revokeObjectURL(this.preview());
    this.preview.set(''); this.file.set(null); this.reportDirty();
  }
  upload(): void {
    const guest = this.selected(), file = this.file(); if (!guest || !file) return;
    this.run(this.service.uploadImage(this.eventId, guest.id, file), 'Foto enviada.', () => {
      this.clearFile(); this.refreshSelected(guest.id); this.loadLinked();
    });
  }
  removePhoto(): void {
    const guest = this.selected(); if (!guest) return;
    this.run(this.service.removeImage(this.eventId, guest.id), 'Foto removida.', () => {
      this.clearFile(); this.selected.set({ ...guest, image_url: undefined }); this.load(); this.loadLinked();
    });
  }
  private refreshSelected(id: number): void {
    // Find the selected ID through cursor pages; never infer an ID from a name.
    const find = (cursor?: string): void => {
      this.service.guests(this.eventId, cursor).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: page => {
          const guest = page.content.find(row => row.id === id);
          if (guest && this.selected()?.id === id) this.selected.set({ ...guest, image_url: guest.image_url ? `${guest.image_url}?v=${Date.now()}` : undefined });
          else if (!guest && page.next_cursor && page.next_cursor !== cursor) find(page.next_cursor);
        }, error: e => this.error.set(apiErrorMessage(e, 'Foto salva, mas não foi possível atualizar a prévia.')),
      });
    };
    find(); this.load();
  }
  associate(): void {
    const guest = this.selected(); if (!guest || !this.activityId) return;
    this.run(this.service.associate(this.eventId, guest.id, this.activityId, this.role.value), 'Participação na atividade salva.', () => {
      this.role.markAsPristine(); this.reportDirty(); this.loadLinked();
    });
  }
  toggle(field: 'status' | 'visibility'): void {
    const guest = this.selected(); if (!guest) return;
    const update = field === 'status' ? { status: guest.status === 'CONFIRMED' ? 'CANCELED' as const : 'CONFIRMED' as const }
      : { visibility: guest.visibility === 'PUBLIC' ? 'PRIVATE' as const : 'PUBLIC' as const };
    this.run(this.service.update(this.eventId, guest.id, update), 'Preferências atualizadas para este convidado no evento.', () => {
      this.selected.set({ ...guest, ...update }); this.load(); this.loadLinked();
    });
  }
  loadInvitations(more = false): void {
    if (more && !this.invitationCursor()) return;
    this.service.invitations(this.eventId, '', more ? this.invitationCursor()! : undefined)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: page => { this.invitations.update(rows => more ? [...rows, ...page.content] : page.content); this.invitationCursor.set(page.next_cursor); },
        error: e => this.error.set(apiErrorMessage(e, 'Não foi possível consultar os convites.')),
      });
  }
  invite(): void {
    this.email.markAsTouched(); if (this.email.invalid) return;
    this.run(this.service.invite(this.eventId, this.email.value), response => apiMessage(response, 'Convite solicitado para o evento.'), () => {
      this.email.reset(); this.reportDirty(); this.loadInvitations();
    });
  }
  cancel(invitation: GuestInvitation): void {
    this.run(this.service.cancel(invitation.id), 'Convite cancelado.', () => this.loadInvitations());
  }
  private run<T>(request: Observable<T>, message: string | ((response: T) => string), done: () => void): void {
    if (this.busy() || this.disabled) return;
    this.busy.set(true); this.busyChange.emit(true); this.error.set(''); this.message.set('');
    request.pipe(takeUntilDestroyed(this.destroyRef), finalize(() => { this.busy.set(false); this.busyChange.emit(false); })).subscribe({
      next: response => { this.message.set(typeof message === 'string' ? message : message(response)); done(); },
      error: e => this.error.set(apiErrorMessage(e, 'Não foi possível concluir. Seus dados foram mantidos para tentar novamente.')),
    });
  }
}
