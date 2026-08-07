import { Injectable, signal, computed, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError } from 'rxjs';
import { LoginRequest, RegisterRequest } from '../models/auth-requests.model';
import { AuthResponse } from '../models/auth-response.model';
import { User } from '../models/user.model';
import { ApiConfig } from '../../../core/api/api.config';


@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly TOKEN_KEY = 'access_token';
  private readonly USER_KEY = 'user_data';

  private currentUser = signal<User | null>(null);
  private isAuthenticated = signal<boolean>(false);

  constructor(
    private http: HttpClient,
    private apiConfig: ApiConfig
  ) {
    if (this.isBrowser()) {
      this.loadFromStorage();
    }
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  private loadFromStorage(): void {
    const token = this.getToken();
    const user = this.getUserFromStorage();
    if (token && user) {
      this.currentUser.set(user);
      this.isAuthenticated.set(true);
    }
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiConfig.authUrl}/login`, credentials).pipe(
      tap((response) => this.handleAuthSuccess(response)),
      catchError((error) => {
        this.logout();
        throw error;
      })
    );
  }

  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiConfig.authUrl}/register`, data).pipe(
      tap((response) => this.handleAuthSuccess(response)),
      catchError((error) => {
        throw error;
      })
    );
  }

  logout(): void {
    if (this.isBrowser()) {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    }
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
  }

  refreshToken(): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiConfig.authUrl}/refresh`, {}).pipe(
      tap((response) => this.handleAuthSuccess(response)),
      catchError((error) => {
        this.logout();
        throw error;
      })
    );
  }

  getToken(): string | null {
    if (!this.isBrowser()) {
      return null;
    }
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getCurrentUser(): User | null {
    return this.currentUser();
  }

  get isAuthenticatedValue(): boolean {
    return this.isAuthenticated();
  }

  private handleAuthSuccess(response: AuthResponse): void {
    if (this.isBrowser()) {
      localStorage.setItem(this.TOKEN_KEY, response.accessToken);
      localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
    }
    this.currentUser.set(response.user);
    this.isAuthenticated.set(true);
  }

  private getUserFromStorage(): User | null {
    if (!this.isBrowser()) {
      return null;
    }
    const userStr = localStorage.getItem(this.USER_KEY);
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }
}
