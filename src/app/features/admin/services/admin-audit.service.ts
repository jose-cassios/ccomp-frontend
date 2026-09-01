import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import {
  AdminAuditLogsPage,
  AdminAuditSearchFilter,
} from '../models/admin-audit-log.model';

@Injectable({ providedIn: 'root' })
export class AdminAuditService {
  private readonly api = inject(ApiService);

  search(
    filter: AdminAuditSearchFilter = {},
    nextCursor?: string,
    pageSize = 20,
  ): Observable<AdminAuditLogsPage> {
    let params = new HttpParams().set('pageSize', pageSize.toString());
    if (nextCursor) {
      params = params.set('nextCursor', nextCursor);
    }

    return this.api.post<AdminAuditLogsPage>('/admin/audit-logs/users/search', filter, { params });
  }
}
