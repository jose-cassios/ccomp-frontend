import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { AdminUser, ApiUserRole } from '../models/admin-user.model';

@Injectable({ providedIn: 'root' })
export class AdminUsersService {
  private readonly api = inject(ApiService);

  getAll(): Observable<AdminUser[]> {
    return this.api.get<AdminUser[]>('/users/all');
  }

  getMe(): Observable<AdminUser> {
    return this.api.get<AdminUser>('/users/me');
  }

  assignRole(userId: string, role: ApiUserRole): Observable<void> {
    return this.api.post<void>(`/users/${encodeURIComponent(userId)}/roles/${role}`, null);
  }

  removeRole(userId: string, role: ApiUserRole): Observable<void> {
    return this.api.delete<void>(`/users/${encodeURIComponent(userId)}/roles/${role}`);
  }
}
