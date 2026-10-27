import { inject, Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { ApiService } from '../../../core/api/api.service';
import { InfraLogFilter, InfraLogsResponse } from '../models/admin-infra-log.model';

@Injectable({ providedIn: 'root' })
export class AdminInfraLogsService {
  private readonly api = inject(ApiService);

  search(filter: InfraLogFilter = {}) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filter)) {
      if (value !== undefined && value !== '') params = params.set(key, String(value));
    }
    return this.api.get<InfraLogsResponse>('/admin/infra-logs', { params });
  }
}
