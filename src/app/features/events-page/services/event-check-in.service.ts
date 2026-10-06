import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ApiConfig } from '../../../core/api/api.config';
import { ApiMessage } from '../models/event.model';

@Injectable({ providedIn: 'root' })
export class EventCheckInService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ApiConfig);

  getQrCode(activityId: number) {
    return this.http.get(this.config.buildUrl(`/events/activity/${activityId}/qrcode`), {
      responseType: 'blob',
    });
  }

  confirm(activityId: number, code: string) {
    return this.http.post<ApiMessage | null>(
      this.config.buildUrl(`/events/activity/${activityId}/check-in`), { code },
    );
  }
}
