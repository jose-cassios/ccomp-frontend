import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api/api.service';

export interface UploadFileResponse {
  url: string;
  file_name: string;
}

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly api = inject(ApiService);

  upload(file: File): Observable<UploadFileResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.api.post<UploadFileResponse>('/storage/upload', formData);
  }
}
