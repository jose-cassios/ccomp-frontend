import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';
import { AuthService } from '../../../auth/services/auth.service';
import { AdminUser, ApiUserRole, USER_ROLE_OPTIONS } from '../../models/admin-user.model';
import { AdminUsersService } from '../../services/admin-users.service';

interface RoleOperation {
  userName: string;
  role: ApiUserRole;
  action: 'Atribuído' | 'Removido';
  at: Date;
}

@Component({
  selector: 'app-admin-users', standalone: true, imports: [FormsModule, DatePipe],
  templateUrl: './admin-users.component.html', styleUrl: './admin-users.component.css',
})
export class AdminUsersComponent implements OnInit {
  private readonly usersService = inject(AdminUsersService);
  private readonly authService = inject(AuthService);
  readonly users = signal<AdminUser[]>([]);
  readonly currentUser = signal<AdminUser | null>(null);
  readonly search = signal('');
  readonly loading = signal(false);
  readonly pendingUserId = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly selectedRoles = signal<Record<string, ApiUserRole>>({});
  readonly recentOperations = signal<RoleOperation[]>([]);
  readonly roleOptions = USER_ROLE_OPTIONS;
  readonly filteredUsers = computed(() => {
    const term = this.search().trim().toLocaleLowerCase();
    if (!term) return this.users();
    return this.users().filter((user) => [user.name, user.email_address, user.id]
      .some((value) => value.toLocaleLowerCase().includes(term)));
  });
  readonly isBusy = computed(() => this.pendingUserId() !== null);
  readonly currentRoles = computed(() => this.authService.getCurrentRoles());

  ngOnInit(): void { this.reload(); }

  reload(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.errorMessage.set(null);
    forkJoin({ users: this.usersService.getAll(), currentUser: this.usersService.getMe() })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ users, currentUser }) => {
          this.users.set([...users].sort((a, b) => a.name.localeCompare(b.name)));
          this.currentUser.set(currentUser);
        },
        error: () => this.errorMessage.set('Não foi possível carregar os usuários. Confirme suas permissões e tente novamente.'),
      });
  }

  selectRole(userId: string, role: ApiUserRole): void {
    this.selectedRoles.update((roles) => ({ ...roles, [userId]: role }));
  }

  selectedRole(userId: string): ApiUserRole { return this.selectedRoles()[userId] ?? 'USER'; }

  changeRole(user: AdminUser, action: 'assign' | 'remove'): void {
    if (this.isBusy()) return;
    const role = this.selectedRole(user.id);
    if (action === 'remove' && role === 'ADMIN' && user.id === this.currentUser()?.id) {
      this.errorMessage.set('Para evitar perder o acesso ao painel, você não pode remover seu próprio papel de administrador aqui.');
      return;
    }
    this.pendingUserId.set(user.id);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    const request = action === 'assign' ? this.usersService.assignRole(user.id, role) : this.usersService.removeRole(user.id, role);
    request.pipe(finalize(() => this.pendingUserId.set(null))).subscribe({
      next: () => {
        const actionLabel: RoleOperation['action'] = action === 'assign' ? 'Atribuído' : 'Removido';
        this.successMessage.set(`${actionLabel} o papel ${this.roleLabel(role)} para ${user.name}.`);
        this.recentOperations.update((operations) => [
          { userName: user.name, role, action: actionLabel, at: new Date() }, ...operations,
        ].slice(0, 8));
      },
      error: () => this.errorMessage.set(`Não foi possível ${action === 'assign' ? 'atribuir' : 'remover'} este papel. Tente novamente.`),
    });
  }

  roleLabel(role: ApiUserRole): string { return this.roleOptions.find((option) => option.value === role)?.label ?? role; }
}
