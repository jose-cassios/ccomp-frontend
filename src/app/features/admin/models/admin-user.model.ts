/** Matches the UserDTO returned by the administrative user endpoints. */
export interface AdminUser {
  id: string;
  name: string;
  email_address: string;
  status_account: AdminUserStatus;
  created_at: string;
  updated_at: string;
}

export type AdminUserStatus = 'ACTIVE' | 'DEACTIVATED' | 'BLOCKED';

export interface AdminUserSearchFilter {
  status_account?: AdminUserStatus;
}

export interface AdminUsersPage {
  content: AdminUser[];
  next_cursor: string | null;
  previous_cursor: string | null;
}

/** Exact enum accepted by the user-role endpoints. */
export type ApiUserRole = 'ADMIN' | 'STAFF' | 'USER';

export const USER_ROLE_OPTIONS: ReadonlyArray<{ value: ApiUserRole; label: string }> = [
  { value: 'USER', label: 'Usuário' },
  { value: 'STAFF', label: 'Moderador' },
  { value: 'ADMIN', label: 'Administrador' },
];
