import { Injectable } from '@angular/core';

export interface InstructorRosterEntry { name: string; email: string; guest_id?: number; key?: string; mode?: 'invite' | 'direct'; description?: string; role?: 'INSTRUCTOR' | 'ASSISTANT'; }

/** Preparation only: the API currently creates instructor records and invitations per activity. */
@Injectable({ providedIn: 'root' })
export class InstructorRosterDraftService {
  private readonly memory = new Map<string, InstructorRosterEntry[]>();
  private key(eventId: number, userId: string): string { return `ccomp:instructor-roster:${userId}:${eventId}`; }
  read(eventId: number, userId: string): InstructorRosterEntry[] {
    const key = this.key(eventId, userId);
    if (this.memory.has(key)) return this.memory.get(key)!;
    try {
      const rows: unknown = JSON.parse(sessionStorage.getItem(key) ?? '[]');
      return Array.isArray(rows) ? rows.filter((row): row is InstructorRosterEntry =>
        typeof row?.name === 'string' && typeof row?.email === 'string' && (row.mode === 'direct' ? !!row.name.trim() : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email))) : [];
    } catch { return []; }
  }
  save(eventId: number, userId: string, rows: InstructorRosterEntry[]): boolean {
    const key = this.key(eventId, userId);
    this.memory.set(key, rows);
    try { sessionStorage.setItem(key, JSON.stringify(rows)); return true; } catch { return false; }
  }
}
