import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import {
  AdminUser,
  AdminUserSearchFilter,
  AdminUsersPage,
  ApiUserRole,
} from '../models/admin-user.model';

@Injectable({ providedIn: 'root' })
export class AdminUsersService {
  private readonly api = inject(ApiService);

  search(
    filter: AdminUserSearchFilter = {},
    nextCursor?: string,
    pageSize = 50,
  ): Observable<AdminUsersPage> {
    let params = new HttpParams().set('pageSize', pageSize.toString());
    if (nextCursor) {
      params = params.set('nextCursor', nextCursor);
    }

    return this.api.post<AdminUsersPage>('/admin/users/search', filter, { params });
  }

  getMe(): Observable<AdminUser> {
    return this.api.get<AdminUser>('/users/me');
  }

  assignRole(userId: string, role: ApiUserRole): Observable<void> {
    return this.api.post<void>(`/admin/users/${encodeURIComponent(userId)}/roles/${role}`, null);
  }

  removeRole(userId: string, role: ApiUserRole): Observable<void> {
    return this.api.delete<void>(`/admin/users/${encodeURIComponent(userId)}/roles/${role}`);
  }

  block(userId: string, reason: string): Observable<{ message: string }> {
    return this.api.post<{ message: string }>(
      `/admin/users/${encodeURIComponent(userId)}/block`,
      { reason },
    );
  }

  unlock(userId: string, reason: string): Observable<{ message: string }> {
    return this.api.post<{ message: string }>(
      `/admin/users/${encodeURIComponent(userId)}/unlock`,
      { reason },
    );
  }
}
