import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ApiConfig {
  private readonly BASE_URL = environment.apiUrl;

  get baseUrl(): string {
    return this.BASE_URL;
  }

  get authUrl(): string {
    return `${this.BASE_URL}/auth`;
  }

  buildUrl(endpoint: string): string {
    return `${this.BASE_URL}${endpoint}`;
  }
}
