import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, forkJoin, map, switchMap } from 'rxjs';
import { apiErrorMessage } from '../../../../core/api/api-error';
import { AuthService } from '../../../auth/services/auth.service';
import {
  AdminAuditAction,
  AdminAuditLog,
  AdminAuditSearchFilter,
  AUDIT_ACTION_OPTIONS,
} from '../../models/admin-audit-log.model';
import {
  AdminUser,
  AdminUserSearchFilter,
  AdminUserStatus,
  ApiUserRole,
  USER_ROLE_OPTIONS,
} from '../../models/admin-user.model';
import { AdminAuditService } from '../../services/admin-audit.service';
import { AdminUsersService } from '../../services/admin-users.service';

interface RoleOperation {
  userName: string;
  role: ApiUserRole;
  at: Date;
}

@Component({
  selector: 'app-admin-users', standalone: true, imports: [FormsModule, DatePipe],
  templateUrl: './admin-users.component.html', styleUrl: './admin-users.component.css',
})
export class AdminUsersComponent implements OnInit {
  private readonly usersService = inject(AdminUsersService);
  private readonly auditService = inject(AdminAuditService);
  private readonly authService = inject(AuthService);
  readonly activeSection = signal<'users' | 'audit'>('users');
  readonly users = signal<AdminUser[]>([]);
  readonly currentUser = signal<AdminUser | null>(null);
  readonly search = signal('');
  readonly statusFilter = signal<AdminUserStatus | ''>('');
  readonly roleFilter = signal<ApiUserRole | ''>('');
  readonly loading = signal(false);
  readonly loadingMore = signal(false);
  readonly nextCursor = signal<string | null>(null);
  readonly pendingUserId = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly selectedRoles = signal<Record<string, ApiUserRole>>({});
  readonly recentOperations = signal<RoleOperation[]>([]);
  readonly roleOptions = USER_ROLE_OPTIONS;
  readonly auditLogs = signal<AdminAuditLog[]>([]);
  readonly auditLoading = signal(false);
  readonly auditLoadingMore = signal(false);
  readonly auditNextCursor = signal<string | null>(null);
  readonly auditActionFilter = signal<AdminAuditAction | ''>('');
  readonly auditActorId = signal('');
  readonly auditTargetId = signal('');
  readonly auditStartDate = signal('');
  readonly auditEndDate = signal('');
  readonly auditActionOptions = AUDIT_ACTION_OPTIONS;
  readonly filteredUsers = computed(() => {
    const term = this.search().trim().toLocaleLowerCase();
    if (!term) return this.users();
    return this.users().filter((user) => [user.name, user.email_address, user.id]
      .some((value) => value.toLocaleLowerCase().includes(term)));
  });
  readonly isBusy = computed(() => this.pendingUserId() !== null);
  readonly canManageRoles = computed(() => this.authService.hasAnyRole(['ADM']));

  ngOnInit(): void { this.reload(); }

  selectSection(section: 'users' | 'audit'): void {
    this.activeSection.set(section);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    if (section === 'audit' && !this.auditLogs().length) {
      this.reloadAudit();
    }
  }

  refreshActiveSection(): void {
    if (this.activeSection() === 'users') {
      this.reload();
      return;
    }
    this.reloadAudit();
  }

  reload(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.errorMessage.set(null);
    const filter = this.buildFilter();
    forkJoin({ page: this.usersService.search(filter), currentUser: this.usersService.getMe() })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ page, currentUser }) => {
          this.users.set(this.sortUsers(page.content));
          this.nextCursor.set(page.next_cursor);
          this.currentUser.set(currentUser);
        },
        error: () => this.errorMessage.set('Não foi possível carregar os usuários. Confirme suas permissões e tente novamente.'),
      });
  }

  loadMore(): void {
    const cursor = this.nextCursor();
    if (!cursor || this.loadingMore() || this.isBusy()) return;

    this.loadingMore.set(true);
    this.errorMessage.set(null);
    this.usersService.search(this.buildFilter(), cursor).pipe(
      finalize(() => this.loadingMore.set(false)),
    ).subscribe({
      next: (page) => {
        const usersById = new Map(this.users().map((user) => [user.id, user]));
        page.content.forEach((user) => usersById.set(user.id, user));
        this.users.set(this.sortUsers([...usersById.values()]));
        this.nextCursor.set(page.next_cursor);
      },
      error: () => this.errorMessage.set('Não foi possível carregar mais usuários.'),
    });
  }

  filterByStatus(status: AdminUserStatus | ''): void {
    this.statusFilter.set(status);
    this.reload();
  }

  filterByRole(role: ApiUserRole | ''): void {
    this.roleFilter.set(role);
    this.reload();
  }

  searchExact(): void {
    const term = this.search().trim();
    if (!term || this.loading() || this.isBusy()) return;

    const request = term.includes('@')
      ? this.usersService.getByEmail(term)
      : /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(term)
        ? this.usersService.getById(term)
        : null;

    if (!request) {
      this.errorMessage.set('Para buscar em toda a base, informe um e-mail completo ou o ID do usuário.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    request.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (user) => {
        const usersById = new Map(this.users().map((item) => [item.id, item]));
        usersById.set(user.id, user);
        this.users.set(this.sortUsers([...usersById.values()]));
      },
      error: () => this.errorMessage.set('Nenhum usuário foi encontrado com esse e-mail ou ID.'),
    });
  }

  selectRole(userId: string, role: ApiUserRole): void {
    this.selectedRoles.update((roles) => ({ ...roles, [userId]: role }));
  }

  selectedRole(user: AdminUser): ApiUserRole {
    return this.selectedRoles()[user.id] ?? user.role;
  }

  changeRole(user: AdminUser): void {
    if (this.isBusy()) return;
    const role = this.selectedRole(user);
    this.pendingUserId.set(user.id);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.usersService.assignRole(user.id, role).pipe(
      switchMap((response) => this.usersService.getById(user.id).pipe(
        map((updatedUser) => ({ response, updatedUser })),
      )),
      finalize(() => this.pendingUserId.set(null)),
    ).subscribe({
      next: ({ updatedUser }) => {
        this.users.update((users) => users.map((item) =>
          item.id === user.id ? updatedUser : item,
        ));
        this.selectedRoles.update((roles) => ({ ...roles, [user.id]: updatedUser.role }));
        if (updatedUser.role !== role) {
          this.errorMessage.set('A API respondeu à alteração, mas não confirmou o novo papel na consulta do usuário.');
          return;
        }
        this.successMessage.set(`Atribuído o papel ${this.roleLabel(role)} para ${user.name}.`);
        this.recentOperations.update((operations) => [
          { userName: user.name, role, at: new Date() }, ...operations,
        ].slice(0, 8));
      },
      error: (error: unknown) => this.errorMessage.set(apiErrorMessage(
        error,
        'Não foi possível atribuir este papel. Tente novamente.',
      )),
    });
  }

  changeAccountStatus(user: AdminUser, action: 'block' | 'unlock'): void {
    if (this.isBusy()) return;

    if (action === 'block' && user.id === this.currentUser()?.id) {
      this.errorMessage.set('Você não pode bloquear a própria conta durante esta sessão.');
      return;
    }

    if (typeof window === 'undefined') return;
    const reason = window.prompt(
      action === 'block' ? 'Informe o motivo do bloqueio:' : 'Informe o motivo do desbloqueio:',
    )?.trim();
    if (!reason) return;

    this.pendingUserId.set(user.id);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    const request = action === 'block'
      ? this.usersService.block(user.id, reason)
      : this.usersService.unlock(user.id, reason);

    request.pipe(finalize(() => this.pendingUserId.set(null))).subscribe({
      next: (response) => {
        const status: AdminUserStatus = action === 'block' ? 'BLOCKED' : 'ACTIVE';
        this.users.update((users) => users.map((item) =>
          item.id === user.id ? { ...item, status_account: status } : item,
        ));
        this.successMessage.set(response.response);
      },
      error: () => this.errorMessage.set(
        `Não foi possível ${action === 'block' ? 'bloquear' : 'desbloquear'} esta conta.`,
      ),
    });
  }

  roleLabel(role?: ApiUserRole): string {
    return role ? this.roleOptions.find((option) => option.value === role)?.label ?? role : 'Não informado';
  }

  statusLabel(status: AdminUserStatus): string {
    return { ACTIVE: 'Ativa', DEACTIVATED: 'Desativada', BLOCKED: 'Bloqueada' }[status];
  }

  reloadAudit(): void {
    if (this.auditLoading()) return;
    const filter = this.buildAuditFilter();
    if (!filter) return;

    this.auditLoading.set(true);
    this.errorMessage.set(null);
    this.auditService.search(filter).pipe(finalize(() => this.auditLoading.set(false))).subscribe({
      next: (page) => {
        this.auditLogs.set(page.content);
        this.auditNextCursor.set(page.next_cursor);
      },
      error: () => this.errorMessage.set('Não foi possível carregar os registros de auditoria.'),
    });
  }

  loadMoreAudit(): void {
    const cursor = this.auditNextCursor();
    if (!cursor || this.auditLoadingMore()) return;
    const filter = this.buildAuditFilter();
    if (!filter) return;

    this.auditLoadingMore.set(true);
    this.errorMessage.set(null);
    this.auditService.search(filter, cursor).pipe(finalize(() => this.auditLoadingMore.set(false))).subscribe({
      next: (page) => {
        const logsById = new Map(this.auditLogs().map((log) => [log.id, log]));
        page.content.forEach((log) => logsById.set(log.id, log));
        this.auditLogs.set([...logsById.values()]);
        this.auditNextCursor.set(page.next_cursor);
      },
      error: () => this.errorMessage.set('Não foi possível carregar mais registros de auditoria.'),
    });
  }

  resetAuditFilters(): void {
    this.auditActionFilter.set('');
    this.auditActorId.set('');
    this.auditTargetId.set('');
    this.auditStartDate.set('');
    this.auditEndDate.set('');
    this.reloadAudit();
  }

  auditActionLabel(action: string): string {
    return this.auditActionOptions.find((option) => option.value === action)?.label
      ?? action.replaceAll('_', ' ');
  }

  auditTargetLabel(targetType: string): string {
    return {
      USER: 'Usuário', NEWS: 'Notícia', CLUB: 'Clube', EVENT: 'Evento', ACTIVITY: 'Atividade',
    }[targetType] ?? targetType;
  }

  auditChangesSummary(log: AdminAuditLog): string {
    const entries = Object.entries(log.changes ?? {});
    if (!entries.length) return 'Nenhuma alteração detalhada foi informada.';
    return entries.map(([field, change]) =>
      `${this.auditFieldLabel(field)}: ${this.auditValue(change.old_value)} → ${this.auditValue(change.new_value)}`,
    ).join(' · ');
  }

  private buildFilter(): AdminUserSearchFilter {
    const filter: AdminUserSearchFilter = {};
    if (this.statusFilter()) filter.status_account = this.statusFilter() as AdminUserStatus;
    if (this.roleFilter()) filter.role = this.roleFilter() as ApiUserRole;
    return filter;
  }

  private buildAuditFilter(): AdminAuditSearchFilter | null {
    const actorId = this.auditActorId().trim();
    const targetId = this.auditTargetId().trim();
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if ((actorId && !uuidPattern.test(actorId)) || (targetId && !uuidPattern.test(targetId))) {
      this.errorMessage.set('Use um UUID válido para filtrar o responsável ou o alvo da ação.');
      return null;
    }

    const startDate = this.auditStartDate();
    const endDate = this.auditEndDate();
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      this.errorMessage.set('A data inicial da auditoria deve ser anterior à data final.');
      return null;
    }

    const filter: AdminAuditSearchFilter = {};
    if (this.auditActionFilter()) filter.action = this.auditActionFilter() as AdminAuditAction;
    if (actorId) filter.actor_id = actorId;
    if (targetId) filter.target_id = targetId;
    if (startDate) filter.start_date = startDate;
    if (endDate) filter.end_date = endDate;
    return filter;
  }

  private auditFieldLabel(field: string): string {
    return { status_account: 'Status da conta', roles: 'Papel' }[field] ?? field;
  }

  private auditValue(value: unknown): string {
    if (value === null || value === undefined || value === '') return '—';
    return String(value);
  }

  private sortUsers(users: AdminUser[]): AdminUser[] {
    return [...users].sort((a, b) => a.name.localeCompare(b.name));
  }
}
