/** Matches the UserDTO returned by /api/users/all and /api/users/me. */
export interface AdminUser {
  id: string;
  name: string;
  email_address: string;
}

/** Exact enum accepted by the user-role endpoints. */
export type ApiUserRole = 'ADMIN' | 'STAFF' | 'USER';

export const USER_ROLE_OPTIONS: ReadonlyArray<{ value: ApiUserRole; label: string }> = [
  { value: 'USER', label: 'Usuário' },
  { value: 'STAFF', label: 'Moderador' },
  { value: 'ADMIN', label: 'Administrador' },
];
