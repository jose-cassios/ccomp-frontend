import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize, of, switchMap } from 'rxjs';
import { StorageService } from '../../core/storage/storage.service';
import { CONTENT_MANAGEMENT_ROLES } from '../auth/config/auth.config';
import { AuthService } from '../auth/services/auth.service';
import { ClubeDestaquesComponent } from './components/clube-destaques/clube-destaques.component';
import { TodosClubesComponent } from './components/todos-clubes/todos-clubes.component';
import {
  Club,
  ClubMemberFilter,
  ClubMemberListItem,
  ClubMemberRole,
  ClubMemberStatus,
  UpdateClubPayload,
} from './models/clube.model';
import { ClubesService } from './services/clubes.service';

type ClubModal = 'details' | 'editor' | 'members' | null;

@Component({
  selector: 'app-clubes',
  imports: [CommonModule, ReactiveFormsModule, ClubeDestaquesComponent, TodosClubesComponent],
  templateUrl: './clubes.html',
  styleUrl: './clubes.css',
})
export class Clubes implements OnInit {
  private readonly clubsService = inject(ClubesService);
  private readonly storageService = inject(StorageService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly clubs = signal<Club[]>([]);
  readonly highlightedClubs = signal<Club[]>([]);
  readonly managedClubs = signal<Club[]>([]);
  readonly members = signal<ClubMemberListItem[]>([]);
  readonly selectedClub = signal<Club | null>(null);
  readonly activeModal = signal<ClubModal>(null);

  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly highlightsLoading = signal(true);
  readonly managedLoading = signal(false);
  readonly membersLoading = signal(false);
  readonly saving = signal(false);
  readonly uploading = signal(false);
  readonly enrollingClubId = signal<number | null>(null);
  readonly changingMemberId = signal<number | null>(null);

  readonly nextCursor = signal<string | null>(null);
  readonly managedNextCursor = signal<string | null>(null);
  readonly memberNextCursor = signal<string | null>(null);

  readonly publicError = signal<string | null>(null);
  readonly managementError = signal<string | null>(null);
  readonly modalError = signal<string | null>(null);
  readonly message = signal<string | null>(null);

  readonly canManage = computed(() =>
    this.authService.hasAnyRole(CONTENT_MANAGEMENT_ROLES) || this.managedClubs().length > 0,
  );
  readonly isAuthenticated = this.authService.isAuthenticatedState;
  readonly editingClub = computed(() => this.clubForm.controls.id.value > 0);

  readonly clubForm = this.fb.nonNullable.group({
    id: [0],
    name: ['', [Validators.required, Validators.minLength(3)]],
    summary: ['', [Validators.required, Validators.minLength(10)]],
    cover_image_url: ['', Validators.pattern(/^https?:\/\/.+/)],
    published_at: [''],
    content: [''],
  });

  readonly memberFilterForm = this.fb.nonNullable.group({
    role: ['' as '' | ClubMemberRole],
    status: ['' as '' | ClubMemberStatus],
  });

  readonly memberForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    role: ['MEMBER' as ClubMemberRole, Validators.required],
  });

  ngOnInit(): void {
    this.loadClubs();
    this.loadHighlights();
    if (this.isAuthenticated()) {
      this.loadManagedClubs();
    }
  }

  loadClubs(loadMore = false): void {
    const cursor = loadMore ? this.nextCursor() ?? undefined : undefined;
    if (loadMore && !cursor) return;

    (loadMore ? this.loadingMore : this.loading).set(true);
    this.publicError.set(null);
    this.clubsService.search(cursor).pipe(
      finalize(() => (loadMore ? this.loadingMore : this.loading).set(false)),
    ).subscribe({
      next: (page) => {
        this.clubs.update((current) => loadMore ? this.mergeById(current, page.content) : page.content);
        this.nextCursor.set(page.next_cursor);
      },
      error: (error: unknown) => {
        this.publicError.set(this.errorMessage(error, 'Não foi possível carregar os clubes.'));
      },
    });
  }

  loadHighlights(): void {
    this.highlightsLoading.set(true);
    this.clubsService.getHighlights().pipe(
      finalize(() => this.highlightsLoading.set(false)),
    ).subscribe({
      next: (clubs) => this.highlightedClubs.set(clubs),
      error: () => this.highlightedClubs.set([]),
    });
  }

  loadManagedClubs(loadMore = false): void {
    const cursor = loadMore ? this.managedNextCursor() ?? undefined : undefined;
    if (loadMore && !cursor) return;

    this.managedLoading.set(true);
    this.managementError.set(null);
    this.clubsService.getMine(cursor).pipe(
      finalize(() => this.managedLoading.set(false)),
    ).subscribe({
      next: (page) => {
        this.managedClubs.update((current) => loadMore ? this.mergeById(current, page.content) : page.content);
        this.managedNextCursor.set(page.next_cursor);
      },
      error: (error: unknown) => {
        this.managementError.set(this.errorMessage(error, 'Não foi possível carregar os clubes gerenciados.'));
      },
    });
  }

  openDetails(club: Club): void {
    this.selectedClub.set(club);
    this.activeModal.set('details');
    this.modalError.set(null);
    if (!this.isAuthenticated()) return;

    this.clubsService.getById(club.id).subscribe({
      next: (details) => this.selectedClub.set(details),
      error: (error: unknown) => this.modalError.set(this.errorMessage(error, 'Não foi possível carregar todos os detalhes do clube.')),
    });
  }

  enroll(club: Club): void {
    this.clearFeedback();
    if (!this.isAuthenticated()) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: '/projetos/clubes' } });
      return;
    }

    this.enrollingClubId.set(club.id);
    this.clubsService.enroll(club.id).pipe(
      finalize(() => this.enrollingClubId.set(null)),
    ).subscribe({
      next: () => {
        this.message.set(`Inscrição em “${club.name}” realizada com sucesso.`);
        if (this.activeModal() === 'details') this.closeModal();
      },
      error: (error: unknown) => this.modalError.set(this.errorMessage(error, 'Não foi possível realizar a inscrição.')),
    });
  }

  openCreateClub(): void {
    this.clubForm.reset({ id: 0, name: '', summary: '', cover_image_url: '', published_at: '', content: '' });
    this.modalError.set(null);
    this.activeModal.set('editor');
  }

  openEditClub(club: Club): void {
    this.setClubForm(club);
    this.selectedClub.set(club);
    this.modalError.set(null);
    this.activeModal.set('editor');
    this.clubsService.getById(club.id).subscribe({
      next: (details) => {
        this.selectedClub.set(details);
        this.setClubForm(details);
      },
      error: (error: unknown) => this.modalError.set(this.errorMessage(error, 'Não foi possível carregar o clube para edição.')),
    });
  }

  saveClub(): void {
    if (this.clubForm.invalid || this.saving()) {
      this.clubForm.markAllAsTouched();
      return;
    }

    const value = this.clubForm.getRawValue();
    const updatePayload = this.clubUpdatePayload(value);
    this.saving.set(true);
    this.modalError.set(null);

    const request = value.id
      ? this.clubsService.update(value.id, updatePayload)
      : this.clubsService.create({ name: value.name.trim(), summary: value.summary.trim() }).pipe(
          switchMap((created) => this.hasAdditionalClubFields(value)
            ? this.clubsService.update(created.id, updatePayload)
            : of(created)),
        );

    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (saved) => {
        this.message.set(`Clube “${saved.name}” salvo com sucesso.`);
        this.closeModal();
        this.refreshClubLists();
      },
      error: (error: unknown) => this.modalError.set(this.errorMessage(error, 'Não foi possível salvar o clube.')),
    });
  }

  uploadCover(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || this.uploading()) return;
    if (!file.type.startsWith('image/')) {
      this.modalError.set('Selecione um arquivo de imagem válido.');
      input.value = '';
      return;
    }

    this.uploading.set(true);
    this.modalError.set(null);
    this.storageService.upload(file).pipe(
      finalize(() => {
        this.uploading.set(false);
        input.value = '';
      }),
    ).subscribe({
      next: (response) => this.clubForm.controls.cover_image_url.setValue(response.url),
      error: (error: unknown) => this.modalError.set(this.errorMessage(error, 'Não foi possível enviar a imagem.')),
    });
  }

  deleteClub(club: Club): void {
    if (typeof window !== 'undefined' && !window.confirm(`Excluir o clube “${club.name}”?`)) return;

    this.managementError.set(null);
    this.clubsService.delete(club.id).subscribe({
      next: () => {
        this.managedClubs.update((clubs) => clubs.filter((item) => item.id !== club.id));
        this.clubs.update((clubs) => clubs.filter((item) => item.id !== club.id));
        this.highlightedClubs.update((clubs) => clubs.filter((item) => item.id !== club.id));
        this.message.set(`Clube “${club.name}” excluído.`);
      },
      error: (error: unknown) => this.managementError.set(this.errorMessage(error, 'Não foi possível excluir o clube.')),
    });
  }

  openMembers(club: Club): void {
    this.selectedClub.set(club);
    this.members.set([]);
    this.memberNextCursor.set(null);
    this.memberFilterForm.reset({ role: '', status: '' });
    this.memberForm.reset({ email: '', role: 'MEMBER' });
    this.modalError.set(null);
    this.activeModal.set('members');
    this.loadMembers();
  }

  loadMembers(loadMore = false): void {
    const club = this.selectedClub();
    const cursor = loadMore ? this.memberNextCursor() ?? undefined : undefined;
    if (!club || (loadMore && !cursor)) return;

    const value = this.memberFilterForm.getRawValue();
    const filter: ClubMemberFilter = {};
    if (value.role) filter.role = value.role;
    if (value.status) filter.status = value.status;
    this.membersLoading.set(true);
    this.modalError.set(null);
    this.clubsService.searchMembers(club.id, filter, cursor).pipe(
      finalize(() => this.membersLoading.set(false)),
    ).subscribe({
      next: (page) => {
        this.members.update((current) => loadMore ? this.mergeMembers(current, page.content) : page.content);
        this.memberNextCursor.set(page.next_cursor);
      },
      error: (error: unknown) => this.modalError.set(this.errorMessage(error, 'Não foi possível carregar os membros.')),
    });
  }

  addMember(): void {
    const club = this.selectedClub();
    if (!club || this.memberForm.invalid || this.membersLoading()) {
      this.memberForm.markAllAsTouched();
      return;
    }

    const { email, role } = this.memberForm.getRawValue();
    this.membersLoading.set(true);
    this.modalError.set(null);
    this.clubsService.addMember(club.id, email.trim(), role).pipe(
      finalize(() => this.membersLoading.set(false)),
    ).subscribe({
      next: () => {
        this.memberForm.reset({ email: '', role: 'MEMBER' });
        this.message.set('Participante adicionado ao clube.');
        this.loadMembers();
      },
      error: (error: unknown) => this.modalError.set(this.errorMessage(error, 'Não foi possível adicionar o participante.')),
    });
  }

  changeMemberStatus(member: ClubMemberListItem): void {
    const status: ClubMemberStatus = member.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    this.changingMemberId.set(member.id);
    this.modalError.set(null);
    this.clubsService.changeMemberStatus(member.id, status).pipe(
      finalize(() => this.changingMemberId.set(null)),
    ).subscribe({
      next: () => this.members.update((members) => members.map((item) => item.id === member.id ? { ...item, status } : item)),
      error: (error: unknown) => this.modalError.set(this.errorMessage(error, 'Não foi possível alterar o status do participante.')),
    });
  }

  closeModal(): void {
    this.activeModal.set(null);
    this.selectedClub.set(null);
    this.modalError.set(null);
  }

  roleLabel(role: ClubMemberRole): string {
    return role === 'INSTRUCTOR' ? 'Instrutor' : 'Membro';
  }

  private setClubForm(club: Club): void {
    this.clubForm.reset({
      id: club.id,
      name: club.name,
      summary: club.summary ?? '',
      cover_image_url: club.cover_image_url ?? '',
      published_at: this.toLocalDateTime(club.published_at),
      content: club.content ?? '',
    });
  }

  private clubUpdatePayload(value: typeof this.clubForm.value): UpdateClubPayload {
    const payload: UpdateClubPayload = {
      name: value.name?.trim(),
      summary: value.summary?.trim(),
      cover_image_url: value.cover_image_url?.trim(),
      content: value.content?.trim(),
    };
    if (value.published_at) payload.published_at = new Date(value.published_at).toISOString();
    return payload;
  }

  private hasAdditionalClubFields(value: typeof this.clubForm.value): boolean {
    return Boolean(value.cover_image_url?.trim() || value.content?.trim() || value.published_at);
  }

  private toLocalDateTime(value: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    const offset = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }

  private refreshClubLists(): void {
    this.loadClubs();
    this.loadHighlights();
    this.loadManagedClubs();
  }

  private clearFeedback(): void {
    this.message.set(null);
    this.modalError.set(null);
  }

  private mergeById(current: Club[], incoming: Club[]): Club[] {
    const items = new Map(current.map((club) => [club.id, club]));
    incoming.forEach((club) => items.set(club.id, club));
    return [...items.values()];
  }

  private mergeMembers(current: ClubMemberListItem[], incoming: ClubMemberListItem[]): ClubMemberListItem[] {
    const items = new Map(current.map((member) => [member.id, member]));
    incoming.forEach((member) => items.set(member.id, member));
    return [...items.values()];
  }

  private errorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const apiMessage = error.error?.message ?? error.error?.detail ?? error.error?.response;
      if (typeof apiMessage === 'string' && apiMessage.trim()) return apiMessage;
      if (error.status === 401) return 'Entre na sua conta para realizar esta ação.';
      if (error.status === 403) return 'Você não tem permissão para realizar esta ação.';
      if (error.status === 404) return 'O clube solicitado não foi encontrado.';
      if (error.status === 409) return 'Esta ação já foi realizada anteriormente.';
    }
    return fallback;
  }
}
