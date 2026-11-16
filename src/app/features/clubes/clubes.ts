import { A11yModule } from '@angular/cdk/a11y';
import { autoDismissFeedback } from '../../core/ui/feedback-auto-dismiss';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, distinctUntilChanged, filter, finalize, from, map, mergeMap, of, Subject, switchMap, takeUntil } from 'rxjs';
import { StorageService } from '../../core/storage/storage.service';
import { apiErrorMessage } from '../../core/api/api-error';
import { CONTENT_MANAGEMENT_ROLES } from '../auth/config/auth.config';
import { AuthService } from '../auth/services/auth.service';
import { ClubeDestaquesComponent } from './components/clube-destaques/clube-destaques.component';
import { TodosClubesComponent } from './components/todos-clubes/todos-clubes.component';
import {
  Club,
  ClubStatus,
  ClubMemberFilter,
  ClubMemberListItem,
  ClubMemberRole,
  ClubMemberStatus,
  UpdateClubPayload,
} from './models/clube.model';
import { ClubesService } from './services/clubes.service';

import { ClubMaterialsComponent } from './components/club-materials/club-materials.component';
import { ClubCertificatesComponent, ClubCertificateDownloadComponent } from './components/club-certificates/club-certificates.component';

type ClubModal = 'details' | 'editor' | 'members' | null;

@Component({
  selector: 'app-clubes',
  imports: [A11yModule, CommonModule, ReactiveFormsModule, ClubeDestaquesComponent, TodosClubesComponent, ClubMaterialsComponent, ClubCertificatesComponent, ClubCertificateDownloadComponent],
  templateUrl: './clubes.html',
  styleUrls: ['./clubes.css', './clubes-workflow.css'],
})
export class Clubes implements OnInit {
  private readonly clubsService = inject(ClubesService);
  private readonly storageService = inject(StorageService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
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
  readonly detailsLoading = signal(false);
  readonly detailsFailed = signal(false);
  readonly deletingClubId = signal<number | null>(null);
  readonly addingMember = signal(false);
  readonly editableIds = signal<ReadonlySet<number>>(new Set());
  readonly resolvedAccessIds = signal<ReadonlySet<number>>(new Set());
  readonly confirmedMemberships = signal<Record<number, boolean>>({});
  private readonly modalClosed = new Subject<void>();
  readonly changingMemberId = signal<number | null>(null);

  readonly nextCursor = signal<string | null>(null);
  readonly managedNextCursor = signal<string | null>(null);
  readonly memberNextCursor = signal<string | null>(null);

  readonly publicError = signal<string | null>(null);
  readonly managementError = signal<string | null>(null);
  readonly modalError = signal<string | null>(null);
  readonly message = signal<string | null>(null);

  readonly canCreate = computed(() => this.authService.hasAnyRole(CONTENT_MANAGEMENT_ROLES));
  readonly isAuthenticated = this.authService.isAuthenticatedState;
  editingClub(): boolean { return this.clubForm.controls.id.value > 0; }
  readonly isModerator = computed(() => this.authService.hasAnyRole(['ADM', 'MODERATOR']));
  readonly childOperations = signal<ReadonlySet<string>>(new Set());
  childWorking(key: string, busy: boolean): void { this.childOperations.update(current => { const next = new Set(current); if (busy) next.add(key); else next.delete(key); return next; }); }
  readonly modalBusy = computed(() => this.childOperations().size > 0 || this.saving() || this.uploading() || this.enrollingClubId() !== null || this.addingMember() || this.changingMemberId() !== null);
  readonly sortedMembers = computed(() => [...this.members()].sort((a, b) => a.user.name.localeCompare(b.user.name, 'pt-BR', { sensitivity: 'base' })));
  private readonly feedback = autoDismissFeedback(this.modalError, this.message, () => this.clearFeedback());
  canEdit(club: Club): boolean { return this.isAuthenticated() && (this.isModerator() || this.editableIds().has(club.id)); }
  canChangeMember(member: ClubMemberListItem): boolean { return this.isModerator() || member.user.id !== this.authService.currentUserState()?.id; }
  readonly statusLabels = { DRAFT: 'Rascunho', OPEN: 'Público', MEMBERS_ONLY: 'Exclusivo para membros' };
  readonly memberStatuses: { value: ClubMemberStatus; label: string }[] = [
    { value: 'ACTIVE', label: 'Ativo' }, { value: 'INACTIVE', label: 'Inativo' },
    { value: 'COMPLETED', label: 'Participação concluída' }, { value: 'CANCELLED', label: 'Cancelado' }, { value: 'BANNED', label: 'Banido' },
  ];
  publicationLabel(club: Club): string { return this.statusLabels[club.status ?? 'DRAFT']; }
  readonly searchForm = this.fb.nonNullable.group({ term: ['', [Validators.minLength(2), Validators.maxLength(100)]] });
  private searchTerm = '';
  private readonly searchChanged = new Subject<void>();
  searchClubs(): void {
    this.searchForm.controls.term.setValue(this.searchForm.controls.term.value.trim());
    this.searchForm.markAllAsTouched();
    if (this.searchForm.invalid) return;
    this.searchChanged.next(); this.searchTerm = this.searchForm.controls.term.value; this.nextCursor.set(null); this.loadClubs();
  }
  isInvolved(club: Club): boolean { return this.confirmedMemberships()[club.id] === true || this.managedClubs().some(item => item.id === club.id); }
  @HostListener('document:keydown.escape') onEscape(): void { this.closeModal(); }
  private resolveAccess(clubs: Club[]): void {
    if (!this.isAuthenticated() || this.isModerator()) return;
    from(clubs.filter(club => !this.resolvedAccessIds().has(club.id))).pipe(
      mergeMap(club => this.clubsService.searchMembers(club.id, { role: 'INSTRUCTOR', status: 'ACTIVE' }, undefined, 1).pipe(
        map(() => ({ id: club.id, allowed: true, resolved: true })),
        catchError((error: unknown) => of({ id: club.id, allowed: false, resolved: error instanceof HttpErrorResponse && [403, 404].includes(error.status) })),
      ), 3), takeUntilDestroyed(this.destroyRef),
    ).subscribe(({ id, allowed, resolved }) => {
      if (resolved) this.resolvedAccessIds.update(ids => new Set(ids).add(id));
      if (allowed) this.editableIds.update(ids => new Set(ids).add(id));
    });
  }

  readonly clubForm = this.fb.nonNullable.group({
    id: [0],
    name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(255), Validators.pattern(/\S/)]],
    summary: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(255), Validators.pattern(/\S/)]],
    cover_image_url: ['', Validators.pattern(/^https?:\/\/.+/)],
    status: ['DRAFT' as ClubStatus, Validators.required],
    max_members: this.fb.control<number | null>(null, [Validators.min(0), Validators.max(Number.MAX_SAFE_INTEGER), Validators.pattern(/^\d+$/)]),
    content: [''],
  });

  private memberQuery: { filter: ClubMemberFilter; term?: string } = { filter: {} };
  readonly memberFilterForm = this.fb.nonNullable.group({
    term: ['', [Validators.minLength(2), Validators.maxLength(100)]],
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
    this.route.queryParamMap.pipe(
      map((params) => Number(params.get('club'))),
      filter((clubId) => Number.isInteger(clubId) && clubId > 0),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((clubId) => this.openClubFromSearch(clubId));
  }

  loadClubs(loadMore = false): void {
    const cursor = loadMore ? this.nextCursor() ?? undefined : undefined;
    if (loadMore && (!cursor || this.loadingMore() || this.loading())) return;

    (loadMore ? this.loadingMore : this.loading).set(true);
    this.publicError.set(null);
    this.clubsService.search(cursor, 10, this.searchTerm || undefined).pipe(
      takeUntil(this.searchChanged),
      takeUntilDestroyed(this.destroyRef), finalize(() => (loadMore ? this.loadingMore : this.loading).set(false)),
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
      takeUntilDestroyed(this.destroyRef), finalize(() => this.highlightsLoading.set(false)),
    ).subscribe({
      next: (clubs) => this.highlightedClubs.set(clubs),
      error: () => this.highlightedClubs.set([]),
    });
  }

  loadManagedClubs(loadMore = false): void {
    if (!this.isAuthenticated() || this.managedLoading()) return;
    if (!loadMore) { this.resolvedAccessIds.set(new Set()); this.editableIds.set(new Set()); }
    const cursor = loadMore ? this.managedNextCursor() ?? undefined : undefined;
    if (loadMore && !cursor) return;

    this.managedLoading.set(true);
    this.managementError.set(null);
    this.clubsService.getMine(cursor, 10).pipe(
      takeUntilDestroyed(this.destroyRef), finalize(() => this.managedLoading.set(false)),
    ).subscribe({
      next: (page) => {
        this.managedClubs.update((current) => loadMore ? this.mergeById(current, page.content) : page.content);
        this.managedNextCursor.set(page.next_cursor);
        this.resolveAccess(page.content);
      },
      error: (error: unknown) => {
        this.managementError.set(this.errorMessage(error, 'Não foi possível carregar os clubes gerenciados.'));
      },
    });
  }

  openDetails(club: Club): void {
    if (this.modalBusy()) return;
    this.modalClosed.next();
    this.detailsLoading.set(true); this.detailsFailed.set(false);
    this.resolveAccess([club]);
    this.selectedClub.set(club);
    this.activeModal.set('details');
    this.modalError.set(null);
    this.clubsService.getById(club.id).pipe(takeUntil(this.modalClosed), takeUntilDestroyed(this.destroyRef), finalize(() => this.detailsLoading.set(false))).subscribe({
      next: (details) => this.selectedClub.set(details),
      error: (error: unknown) => { this.detailsFailed.set(true); this.modalError.set(this.errorMessage(error, 'Não foi possível carregar todos os detalhes do clube.')); },
    });
  }

  retryDetails(): void { const club = this.selectedClub(); if (!club) return; if (this.activeModal() === 'editor') this.openEditClub(club); else this.openDetails(club); }

  private openClubFromSearch(clubId: number): void {
    this.openDetails({ id: clubId, name: 'Carregando clube…', summary: null, content: null, cover_image_url: null, published_at: null, created_at: '', updated_at: '' });
  }

  enroll(club: Club): void {
    if (this.enrollingClubId() !== null || club.status !== 'OPEN') return;
    this.clearFeedback();
    if (!this.isAuthenticated()) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: '/projetos/clubes?club=' + club.id } });
      return;
    }

    this.enrollingClubId.set(club.id);
    this.clubsService.enroll(club.id).pipe(
      takeUntilDestroyed(this.destroyRef), finalize(() => this.enrollingClubId.set(null)),
    ).subscribe({
      next: (membership) => {
        this.confirmedMemberships.update(state => ({ ...state, [club.id]: membership.status === 'ACTIVE' }));
        this.loadManagedClubs();
        this.message.set(`Inscrição em “${club.name}” realizada com sucesso.`);
        // Keep feedback beside the enrollment action.
      },
      error: (error: unknown) => this.modalError.set(this.errorMessage(error, 'Não foi possível realizar a inscrição.')),
    });
  }

  openCreateClub(): void {
    if (!this.canCreate() || this.modalBusy()) return;
    this.modalClosed.next();
    this.selectedClub.set(null); this.detailsFailed.set(false);
    this.clubForm.reset({ id: 0, name: '', summary: '', cover_image_url: '', status: 'DRAFT', max_members: null, content: '' });
    this.modalError.set(null);
    this.activeModal.set('editor');
  }

  unenroll(club: Club): void {
    if (!this.isAuthenticated() || this.enrollingClubId() !== null || !window.confirm(`Cancelar sua participação em “${club.name}”?`)) return;
    this.enrollingClubId.set(club.id);
    this.clearFeedback();
    this.clubsService.unenroll(club.id).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.enrollingClubId.set(null))).subscribe({
      next: () => { this.confirmedMemberships.update(state => ({ ...state, [club.id]: false })); this.editableIds.update(ids => new Set([...ids].filter(id => id !== club.id))); this.resolvedAccessIds.update(ids => new Set([...ids].filter(id => id !== club.id))); this.message.set('Participação cancelada.'); this.loadManagedClubs(); },
      error: (error: unknown) => this.modalError.set(this.errorMessage(error, 'Não foi possível cancelar sua participação.')),
    });
  }

  openEditClub(club: Club): void {
    if (!this.canEdit(club) || this.modalBusy()) return;
    this.modalClosed.next();
    this.detailsLoading.set(true); this.detailsFailed.set(false);
    this.setClubForm(club);
    this.selectedClub.set(club);
    this.modalError.set(null);
    this.activeModal.set('editor');
    this.clubsService.getById(club.id).pipe(takeUntil(this.modalClosed), takeUntilDestroyed(this.destroyRef), finalize(() => this.detailsLoading.set(false))).subscribe({
      next: (details) => {
        this.selectedClub.set(details);
        this.setClubForm(details);
      },
      error: (error: unknown) => { this.detailsFailed.set(true); this.modalError.set(this.errorMessage(error, 'Não foi possível carregar o clube para edição.')); },
    });
  }

  saveClub(): void {
    if (this.detailsLoading() || this.detailsFailed() || (this.editingClub() ? !this.selectedClub() || !this.canEdit(this.selectedClub()!) : !this.canCreate())) return;
    if (this.clubForm.invalid || this.saving() || this.uploading()) {
      this.clubForm.markAllAsTouched();
      return;
    }

    const value = this.clubForm.getRawValue();
    if (value.name.trim().length < 3 || value.summary.trim().length < 10) {
      this.modalError.set('Preencha o nome e o resumo sem contar espaços nas extremidades.'); return;
    }
    if (this.selectedClub()?.max_members != null && value.max_members == null) {
      this.modalError.set('O limite atual precisa ser mantido ou substituído por um número. A API ainda não permite removê-lo.'); return;
    }
    const updatePayload = this.clubUpdatePayload(value);
    this.saving.set(true);
    this.modalError.set(null);

    const request = value.id
      ? this.clubsService.update(value.id, updatePayload)
      : this.clubsService.create({ name: value.name.trim(), summary: value.summary.trim(), ...(value.max_members != null ? { max_members: value.max_members } : {}) }).pipe(
          switchMap((created) => {
            this.clubForm.controls.id.setValue(created.id);
            this.selectedClub.set(created);
            this.editableIds.update(ids => new Set(ids).add(created.id));
            return this.hasAdditionalClubFields(value) ? this.clubsService.update(created.id, updatePayload) : of(created);
          }),
        );

    request.pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.saving.set(false))).subscribe({
      next: (saved) => {
        this.message.set(`Clube “${saved.name}” salvo com sucesso.`);
        this.saving.set(false); this.closeModal();
        this.refreshClubLists();
      },
      error: (error: unknown) => this.modalError.set(this.errorMessage(error, 'Não foi possível salvar o clube.')),
    });
  }

  publishNow(): void {
    if (this.modalBusy() || this.detailsLoading()) return;
    this.clubForm.controls.status.setValue('OPEN');
    this.saveClub();
  }

  uploadCover(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || this.saving() || this.uploading()) return;
    if (!file.type.startsWith('image/') || !file.size || file.size > 10 * 1024 * 1024) {
      this.modalError.set('Selecione uma imagem de até 10 MB.');
      input.value = '';
      return;
    }

    this.uploading.set(true);
    this.modalError.set(null);
    this.storageService.upload(file).pipe(
      takeUntilDestroyed(this.destroyRef), finalize(() => {
        this.uploading.set(false);
        input.value = '';
      }),
    ).subscribe({
      next: (response) => this.clubForm.controls.cover_image_url.setValue(response.url),
      error: (error: unknown) => this.modalError.set(this.errorMessage(error, 'Não foi possível enviar a imagem.')),
    });
  }

  deleteClub(club: Club): void {
    if (!this.canEdit(club) || this.deletingClubId() !== null || this.modalBusy()) return;
    if (typeof window !== 'undefined' && !window.confirm(`Excluir o clube “${club.name}”?`)) return;

    this.managementError.set(null);
    this.deletingClubId.set(club.id);
    this.clubsService.delete(club.id).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.deletingClubId.set(null))).subscribe({
      next: () => {
        this.managedClubs.update((clubs) => clubs.filter((item) => item.id !== club.id));
        this.clubs.update((clubs) => clubs.filter((item) => item.id !== club.id));
        this.highlightedClubs.update((clubs) => clubs.filter((item) => item.id !== club.id));
        this.message.set(`Clube “${club.name}” excluído.`);
        this.closeModal();
      },
      error: (error: unknown) => this.managementError.set(this.errorMessage(error, 'Não foi possível excluir o clube.')),
    });
  }

  openMembers(club: Club): void {
    if (!this.canEdit(club) || this.modalBusy()) return;
    this.modalClosed.next();
    this.selectedClub.set(club);
    this.members.set([]);
    this.memberNextCursor.set(null);
    this.memberFilterForm.reset({ role: '', status: '', term: '' });
    this.memberForm.reset({ email: '', role: 'MEMBER' });
    this.modalError.set(null);
    this.activeModal.set('members');
    this.loadMembers();
  }

  loadMembers(loadMore = false): void {
    const club = this.selectedClub();
    const cursor = loadMore ? this.memberNextCursor() ?? undefined : undefined;
    if (!club || !this.canEdit(club) || this.membersLoading() || (loadMore && !cursor)) return;

    if (!loadMore) {
      this.memberFilterForm.controls.term.setValue(this.memberFilterForm.controls.term.value.trim());
      this.memberFilterForm.markAllAsTouched();
      if (this.memberFilterForm.invalid) return;
      const value = this.memberFilterForm.getRawValue();
      this.memberQuery = { filter: { ...(value.role ? { role: value.role } : {}), ...(value.status ? { status: value.status } : {}) }, term: value.term || undefined };
    }
    const { filter, term } = this.memberQuery;
    this.membersLoading.set(true);
    this.modalError.set(null);
    this.clubsService.searchMembers(club.id, filter, cursor, 10, term).pipe(
      takeUntil(this.modalClosed), takeUntilDestroyed(this.destroyRef), finalize(() => this.membersLoading.set(false)),
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
    if (!club || !this.canEdit(club) || this.memberForm.invalid || this.membersLoading() || this.addingMember() || this.changingMemberId() !== null) {
      this.memberForm.markAllAsTouched();
      return;
    }

    const { email, role } = this.memberForm.getRawValue();
    this.addingMember.set(true);
    this.modalError.set(null);
    this.clubsService.addMember(club.id, email.trim(), role).pipe(
      takeUntilDestroyed(this.destroyRef), finalize(() => this.addingMember.set(false)),
    ).subscribe({
      next: () => {
        this.memberForm.reset({ email: '', role: 'MEMBER' });
        this.message.set('Participante adicionado ao clube.');
        this.loadMembers();
      },
      error: (error: unknown) => this.modalError.set(this.errorMessage(error, 'Não foi possível adicionar o participante.')),
    });
  }

  changeMemberStatus(member: ClubMemberListItem, targetStatus?: ClubMemberStatus): void {
    const club = this.selectedClub();
    if (!club || !this.canEdit(club) || !this.canChangeMember(member) || this.addingMember() || this.changingMemberId() !== null || this.membersLoading()) return;
    const status: ClubMemberStatus = targetStatus ?? (member.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE');
    if (status === member.status) return;
    if (['COMPLETED', 'BANNED'].includes(status) && !window.confirm(status === 'COMPLETED' ? `Concluir a participação de ${member.user.name}? Isso libera seu certificado e encerra o vínculo ativo.` : `Banir ${member.user.name}? A pessoa não poderá se inscrever novamente até ser reativada.`)) return;
    if (status === 'CANCELLED' && !window.confirm(`Cancelar o vínculo de ${member.user.name} com este clube?`)) return;
    this.changingMemberId.set(member.id);
    this.modalError.set(null);
    this.clubsService.changeMemberStatus(club.id, member.id, status).pipe(
      takeUntilDestroyed(this.destroyRef), finalize(() => this.changingMemberId.set(null)),
    ).subscribe({
      next: () => { this.members.update(rows => rows.map(row => row.id === member.id ? { ...row, status } : row)); this.message.set('Status do participante atualizado.'); this.loadMembers(); },
      error: (error: unknown) => this.modalError.set(this.errorMessage(error, 'Não foi possível alterar o status do participante.')),
    });
  }

  changeMemberRole(member: ClubMemberListItem, role: ClubMemberRole): void {
    const club = this.selectedClub();
    if (!club || !this.canEdit(club) || !this.canChangeMember(member) || this.changingMemberId() !== null || this.membersLoading() || this.addingMember() || member.status === 'BANNED' || !member.user.email_address || (member.role === role && member.status === 'ACTIVE')) return;
    if (!window.confirm('Alterar a função de ' + member.user.name + ' para ' + this.roleLabel(role) + '? O vínculo ficará ativo.')) return;
    this.changingMemberId.set(member.id); this.modalError.set(null);
    this.clubsService.addMember(club.id, member.user.email_address, role).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.changingMemberId.set(null))).subscribe({
      next: () => { this.members.update(rows => rows.map(row => row.id === member.id ? { ...row, role, status: 'ACTIVE' } : row)); this.message.set('Função atualizada.'); this.loadMembers(); },
      error: error => this.modalError.set(this.errorMessage(error, 'Não foi possível alterar a função.')),
    });
  }

  closeModal(): void {
    if (this.modalBusy()) return;
    this.modalClosed.next();
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
      status: club.status ?? 'DRAFT',
      max_members: club.max_members ?? null,
      content: club.content ?? '',
    });
  }

  private clubUpdatePayload(value: typeof this.clubForm.value): UpdateClubPayload {
    const payload: UpdateClubPayload = {
      name: value.name?.trim(),
      summary: value.summary?.trim(),
      cover_image_url: value.cover_image_url?.trim(),
      content: value.content?.trim(),
      status: value.status,
      ...(value.max_members != null ? { max_members: value.max_members } : {}),
    };
    return payload;
  }

  private hasAdditionalClubFields(value: typeof this.clubForm.value): boolean {
    return Boolean(value.cover_image_url?.trim() || value.content?.trim() || value.status !== 'DRAFT');
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
      const message = apiErrorMessage(error, '');
      if (message) return message;
      if (error.status === 401) return 'Entre na sua conta para realizar esta ação.';
      if (error.status === 403) return 'Você não tem permissão para realizar esta ação.';
      if (error.status === 404) return 'O clube solicitado não foi encontrado.';
      if (error.status === 409) return 'Esta ação já foi realizada anteriormente.';
    }
    return fallback;
  }
}
