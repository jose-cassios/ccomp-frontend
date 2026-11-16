import { inject, Injectable } from '@angular/core';
import { ApiConfig } from '../../../core/api/api.config';
import { EventMaterialsService } from '../../events-page/services/event-materials.service';

/** Club and event materials share the same upload, pagination and download contract. */
@Injectable({ providedIn: 'root' })
export class ClubMaterialsService extends EventMaterialsService {
  private readonly clubConfig = inject(ApiConfig);
  protected override base(clubId: number): string {
    return this.clubConfig.buildUrl(`/clubs/${clubId}/materials`);
  }
}
