import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { StorageService } from '../../core/storage/storage.service';
import { AuthService } from '../auth/services/auth.service';
import { ClubesService } from './services/clubes.service';
import { Club, ClubMemberListItem } from './models/clube.model';
import { Clubes } from './clubes';

const club: Club = { id: 4, status: 'OPEN', max_members: null, name: 'Clube de robótica', summary: 'Projetos e encontros de robótica.', content: 'Descrição completa.', cover_image_url: null, published_at: null, created_at: '2026-11-01T09:00:00', updated_at: '2026-11-01T09:00:00' };
const member: ClubMemberListItem = { id: 8, club_id: 4, user: { id: 'other', name: 'Ana', email_address: 'ana@example.com' }, role: 'MEMBER', status: 'ACTIVE', joined_at: '', left_at: null };
const emptyPage = { content: [], next_cursor: null, previous_cursor: null };

describe('Clubes workflows', () => {
  let component: Clubes; let fixture: ComponentFixture<Clubes>;
  const authenticated = signal(false); const role = signal('USER');
  const api = { search: vi.fn(), getHighlights: vi.fn(), getMine: vi.fn(), getById: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), enroll: vi.fn(), unenroll: vi.fn(), searchMembers: vi.fn(), addMember: vi.fn(), changeMemberStatus: vi.fn() };
  beforeEach(async () => {
    vi.resetAllMocks(); authenticated.set(false); role.set('USER');
    api.search.mockReturnValue(of({ ...emptyPage, content: [club] })); api.getHighlights.mockReturnValue(of([])); api.getMine.mockReturnValue(of(emptyPage)); api.getById.mockReturnValue(of(club));
    api.create.mockReturnValue(of(club)); api.update.mockImplementation((_id, payload) => of({ ...club, ...payload })); api.delete.mockReturnValue(of(null));
    api.searchMembers.mockReturnValue(of({ ...emptyPage, content: [member] })); api.addMember.mockReturnValue(of({ ...member, user_id: 'other' })); api.changeMemberStatus.mockReturnValue(of(null));
    api.enroll.mockReturnValue(of({ status: 'ACTIVE', role: 'MEMBER' })); api.unenroll.mockReturnValue(of(null));
    await TestBed.configureTestingModule({ imports: [Clubes], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
      { provide: ClubesService, useValue: api }, { provide: StorageService, useValue: { upload: vi.fn() } },
      { provide: AuthService, useValue: { hasAnyRole: (roles: readonly string[]) => roles.includes(role()), isAuthenticatedState: authenticated, currentUserState: () => authenticated() ? { id: 'self' } : null } },
    ] }).compileComponents();
    fixture = TestBed.createComponent(Clubes); component = fixture.componentInstance; fixture.detectChanges();
  });
  afterEach(() => vi.restoreAllMocks());
  function manager() { authenticated.set(true); role.set('ADM'); }
  function validForm() { component.clubForm.patchValue({ name: club.name, summary: club.summary!, content: 'Conteúdo para publicar' }); }

  it('loads public clubs without calling protected membership routes', () => {
    expect(api.search).toHaveBeenCalled(); expect(api.getMine).not.toHaveBeenCalled(); expect(api.searchMembers).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).not.toContain('Meus clubes');
  });
  it('does not confuse ordinary participation with management or creation', () => {
    authenticated.set(true); api.getMine.mockReturnValue(of({ ...emptyPage, content: [club] }));
    api.searchMembers.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    component.loadManagedClubs(); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Meus clubes'); expect(component.canEdit(club)).toBe(false);
    expect(component.managementError()).toBeNull(); expect(component.modalError()).toBeNull();
    component.openCreateClub(); component.openEditClub(club); component.openMembers(club); component.deleteClub(club);
    expect(component.activeModal()).toBeNull(); expect(api.delete).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).not.toContain('Novo clube');
  });
  it('allows an active instructor to manage their club without granting creation to USER', () => {
    authenticated.set(true); api.getMine.mockReturnValue(of({ ...emptyPage, content: [club] })); component.loadManagedClubs();
    expect(component.canEdit(club)).toBe(true); expect(component.canCreate()).toBe(false); component.openEditClub(club);
    expect(component.activeModal()).toBe('editor'); expect(component.detailsLoading()).toBe(false);
  });
  it('allows STAFF to create but not edit an unrelated club; moderators can manage public clubs', () => {
    authenticated.set(true); role.set('STAFF'); expect(component.canCreate()).toBe(true); expect(component.canEdit(club)).toBe(false);
    role.set('MODERATOR'); component.openDetails(club); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Gerenciar membros'); expect(component.canEdit(club)).toBe(true);
  });
  it('preserves the target club when sending a visitor to login', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.enroll(club); expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/projetos/clubes?club=4' } });
    expect(api.enroll).not.toHaveBeenCalled();
  });
  it('prevents duplicate enrollments and refreshes My clubs with visible success feedback', () => {
    authenticated.set(true); const pending = new Subject<{ status: string }>(); api.enroll.mockReturnValue(pending);
    component.openDetails(club); component.enroll(club); component.enroll(club); expect(api.enroll).toHaveBeenCalledTimes(1);
    pending.next({ status: 'ACTIVE' }); pending.complete(); fixture.detectChanges();
    expect(component.confirmedMemberships()[4]).toBe(true); expect(api.getMine).toHaveBeenCalled(); expect(component.enrollingClubId()).toBeNull();
    expect(fixture.nativeElement.querySelector('.modal').textContent).toContain('realizada com sucesso');
  });
  it('does not let stale details overwrite another opened club', () => {
    const pending = new Subject<Club>(); api.getById.mockReturnValueOnce(pending);
    component.openDetails(club); component.openDetails({ ...club, id: 5 });
    expect(pending.observed).toBe(false); pending.next({ ...club, name: 'Resposta atrasada' }); expect(component.selectedClub()?.name).not.toBe('Resposta atrasada');
    component.closeModal(); expect(component.activeModal()).toBeNull();
  });
  it('blocks editing while loading and offers retry after a failed details request', () => {
    manager(); api.getById.mockReturnValueOnce(throwError(() => new Error('failed'))); component.openEditClub(club);
    component.saveClub(); expect(api.update).not.toHaveBeenCalled(); expect(component.detailsFailed()).toBe(true);
    component.retryDetails(); expect(component.detailsFailed()).toBe(false); expect(component.clubForm.controls.name.value).toBe(club.name);
  });
  it('keeps the new club ID after PATCH failure and retries without duplicating creation', () => {
    manager(); component.openCreateClub(); validForm(); api.update.mockReturnValueOnce(throwError(() => new Error('failed')));
    component.saveClub(); expect(component.editingClub()).toBe(true); expect(component.clubForm.controls.id.value).toBe(4);
    expect(component.clubForm.controls.content.value).toBe('Conteúdo para publicar'); expect(component.activeModal()).toBe('editor');
    component.saveClub(); expect(api.create).toHaveBeenCalledTimes(1); expect(api.update).toHaveBeenCalledTimes(2); expect(component.activeModal()).toBeNull();
  });
  it('uses explicit visibility regardless of publication date', () => {
    manager(); component.openEditClub(club); component.clubForm.controls.status.setValue('MEMBERS_ONLY'); component.saveClub();
    expect(api.update).toHaveBeenCalledWith(4, expect.objectContaining({ status: 'MEMBERS_ONLY' }));
    expect(component.publicationLabel({ ...club, status: 'DRAFT', published_at: '2999-01-01T09:00:00' })).toBe('Rascunho');
  });
  it('publishes immediately using the OPEN status PATCH', () => {
    manager(); component.openEditClub(club); component.publishNow();
    expect(api.update).toHaveBeenCalledWith(4, expect.objectContaining({ status: 'OPEN' }));
  });
  it('can return a published club to draft without changing its publication date', () => {
    manager(); api.getById.mockReturnValueOnce(of({ ...club, published_at: '2026-11-01T09:00:00' })); component.openEditClub(club);
    component.clubForm.controls.status.setValue('DRAFT'); component.saveClub();
    expect(api.update).toHaveBeenCalledWith(4, expect.objectContaining({ status: 'DRAFT' }));
    expect(api.update.mock.calls[0][1]).not.toHaveProperty('published_at');
  });
  it('creates drafts with capacity and does not interpret zero as unlimited', () => {
    manager(); component.openCreateClub(); validForm(); component.clubForm.controls.max_members.setValue(0); component.saveClub();
    expect(api.create).toHaveBeenCalledWith(expect.objectContaining({ max_members: 0 }));
    expect(api.update).toHaveBeenCalledWith(4, expect.objectContaining({ status: 'DRAFT', max_members: 0 }));
  });
  it('rejects fractional and negative capacity and cannot silently remove a saved limit', () => {
    manager(); component.openCreateClub(); validForm();
    for (const limit of [-1, 1.5]) { component.clubForm.controls.max_members.setValue(limit); component.saveClub(); }
    expect(api.create).not.toHaveBeenCalled();
    api.getById.mockReturnValue(of({ ...club, max_members: 20 })); component.openEditClub(club);
    component.clubForm.controls.max_members.setValue(null); component.saveClub();
    expect(api.update).not.toHaveBeenCalled(); expect(component.modalError()).toContain('não permite removê-lo');
  });
  it('does not enroll in private clubs or drafts', () => {
    authenticated.set(true); component.enroll({ ...club, status: 'DRAFT' }); component.enroll({ ...club, status: 'MEMBERS_ONLY' });
    expect(api.enroll).not.toHaveBeenCalled();
  });
  it('searches clubs on the server and retains the applied term for subsequent pages', () => {
    api.search.mockReturnValue(of({ ...emptyPage, content: [club], next_cursor: 'next' }));
    component.searchForm.controls.term.setValue(' Robótica '); component.searchClubs();
    expect(api.search).toHaveBeenLastCalledWith(undefined, 10, 'Robótica');
    component.searchForm.controls.term.setValue('not yet applied'); component.loadClubs(true);
    expect(api.search).toHaveBeenLastCalledWith('next', 10, 'Robótica');
  });
  it('supports completed and banned states and prevents changing a banned member role', () => {
    manager(); component.openMembers(club); vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.changeMemberStatus(member, 'COMPLETED'); expect(api.changeMemberStatus).toHaveBeenLastCalledWith(4, 8, 'COMPLETED');
    component.changeMemberStatus(member, 'BANNED'); expect(api.changeMemberStatus).toHaveBeenLastCalledWith(4, 8, 'BANNED');
    component.changeMemberRole({ ...member, status: 'BANNED' }, 'INSTRUCTOR'); expect(api.addMember).not.toHaveBeenCalled();
  });
  it('keeps member search terms and filters stable during pagination', () => {
    manager(); component.openMembers(club);
    api.searchMembers.mockReturnValue(of({ ...emptyPage, content: [member], next_cursor: 'next' }));
    component.memberFilterForm.patchValue({ term: ' Ana ', role: 'MEMBER' }); component.loadMembers();
    component.memberFilterForm.patchValue({ term: 'changed', role: 'INSTRUCTOR' }); component.loadMembers(true);
    expect(api.searchMembers).toHaveBeenLastCalledWith(4, { role: 'MEMBER' }, 'next', 10, 'Ana');
  });
  it('rejects whitespace-only and too-long summary before creating', () => {
    manager(); component.openCreateClub(); validForm(); component.clubForm.controls.summary.setValue(' '.repeat(12)); component.saveClub();
    component.clubForm.controls.summary.setValue('x'.repeat(256)); component.saveClub(); expect(api.create).not.toHaveBeenCalled();
  });
  it('adds members and changes roles through the backend email upsert', () => {
    manager(); component.openMembers(club); component.memberForm.patchValue({ email: 'new@example.com', role: 'INSTRUCTOR' }); component.addMember();
    expect(api.addMember).toHaveBeenCalledWith(4, 'new@example.com', 'INSTRUCTOR'); expect(component.addingMember()).toBe(false);
    vi.spyOn(window, 'confirm').mockReturnValue(true); component.changeMemberRole(member, 'INSTRUCTOR');
    expect(api.addMember).toHaveBeenLastCalledWith(4, 'ana@example.com', 'INSTRUCTOR'); expect(component.changingMemberId()).toBeNull();
  });
  it('prevents instructor self-status changes and refreshes filtered members after a change', () => {
    authenticated.set(true); component.editableIds.set(new Set([4])); component.openMembers(club);
    component.changeMemberStatus({ ...member, user: { ...member.user, id: 'self' } }); expect(api.changeMemberStatus).not.toHaveBeenCalled();
    component.memberFilterForm.patchValue({ status: 'ACTIVE' }); component.changeMemberStatus(member, 'INACTIVE');
    expect(api.changeMemberStatus).toHaveBeenCalledWith(4, 8, 'INACTIVE'); expect(api.searchMembers).toHaveBeenLastCalledWith(4, { status: 'ACTIVE' }, undefined, 10, undefined);
  });
  it('keeps pending add state until the request ends and blocks closing the modal', () => {
    manager(); component.openMembers(club); const pending = new Subject<unknown>(); api.addMember.mockReturnValue(pending);
    component.memberForm.controls.email.setValue('new@example.com'); component.addMember(); component.addMember(); component.closeModal();
    expect(api.addMember).toHaveBeenCalledTimes(1); expect(component.activeModal()).toBe('members');
    pending.error(new Error('failed')); expect(component.addingMember()).toBe(false); expect(component.memberForm.controls.email.value).toBe('new@example.com');
  });
});
