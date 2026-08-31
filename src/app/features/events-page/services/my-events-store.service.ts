import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../auth/services/auth.service';

type StoredEventIds = Record<string, number[]>;

/**
 * Mantém os IDs dos eventos criados nesta plataforma para que rascunhos possam
 * continuar acessíveis ao responsável até a API disponibilizar uma listagem própria.
 */
@Injectable({ providedIn: 'root' })
export class MyEventsStoreService {
  private static readonly storageKey = 'ccomp.my-event-ids.v1';
  private readonly authService = inject(AuthService);

  ids(): number[] {
    const userId = this.currentUserId();
    return userId ? this.read()[userId] ?? [] : [];
  }

  remember(eventId: number): void {
    const userId = this.currentUserId();
    if (!userId || !Number.isInteger(eventId) || eventId <= 0) return;

    const stored = this.read();
    const ids = new Set(stored[userId] ?? []);
    ids.add(eventId);
    stored[userId] = [...ids];
    this.write(stored);
  }

  forget(eventId: number): void {
    const userId = this.currentUserId();
    if (!userId) return;

    const stored = this.read();
    const remaining = (stored[userId] ?? []).filter((id) => id !== eventId);
    if (remaining.length) {
      stored[userId] = remaining;
    } else {
      delete stored[userId];
    }
    this.write(stored);
  }

  private currentUserId(): string | null {
    return this.authService.currentUserState()?.id ?? null;
  }

  private read(): StoredEventIds {
    if (!this.isBrowser()) return {};

    try {
      const raw = localStorage.getItem(MyEventsStoreService.storageKey);
      const parsed: unknown = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' ? parsed as StoredEventIds : {};
    } catch {
      return {};
    }
  }

  private write(value: StoredEventIds): void {
    if (!this.isBrowser()) return;
    localStorage.setItem(MyEventsStoreService.storageKey, JSON.stringify(value));
  }

  private isBrowser(): boolean {
    return typeof localStorage !== 'undefined';
  }
}
