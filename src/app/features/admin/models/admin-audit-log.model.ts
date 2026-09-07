export type AdminAuditAction = 'USER_BLOCKED' | 'USER_UNLOCKED' | 'USER_CHANGE_ROLE';

export interface AdminAuditChange {
  old_value: unknown;
  new_value: unknown;
}

/** Registro retornado pela consulta administrativa de auditoria. */
export interface AdminAuditLog {
  id: number;
  action: AdminAuditAction | string;
  actor_type: 'USER' | 'SYSTEM' | 'INTEGRATION' | string;
  actor_id: string | null;
  target_id: string;
  target_type: 'USER' | 'NEWS' | 'CLUB' | 'EVENT' | 'ACTIVITY' | string;
  reason: string | null;
  changes: Record<string, AdminAuditChange> | null;
  timestamp: string;
}

export interface AdminAuditSearchFilter {
  actor_id?: string;
  target_id?: string;
  action?: AdminAuditAction;
  start_date?: string;
  end_date?: string;
}

export interface AdminAuditLogsPage {
  content: AdminAuditLog[];
  next_cursor: string | null;
  previous_cursor: string | null;
}

export const AUDIT_ACTION_OPTIONS: ReadonlyArray<{ value: AdminAuditAction; label: string }> = [
  { value: 'USER_BLOCKED', label: 'Bloqueio de usuário' },
  { value: 'USER_UNLOCKED', label: 'Desbloqueio de usuário' },
  { value: 'USER_CHANGE_ROLE', label: 'Alteração de papel' },
];
