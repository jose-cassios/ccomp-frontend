import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api/api.service';
import { HttpClient } from '@angular/common/http';
import { ApiConfig } from '../api/api.config';

export interface UploadFileResponse {
  url: string;
  file_name: string;
}

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);
  private readonly config = inject(ApiConfig);

  download(fileName: string): Observable<Blob> {
    return this.http.get(this.config.buildUrl(`/storage/${encodeURIComponent(fileName)}`), { responseType: 'blob' });
  }

  delete(fileName: string): Observable<void> {
    return this.api.delete<void>(`/storage/${encodeURIComponent(fileName)}`);
  }

  upload(file: File): Observable<UploadFileResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.api.post<UploadFileResponse>('/storage/upload', formData);
  }
}
