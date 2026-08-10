import { Injectable, signal, computed, effect } from '@angular/core';
import { Observable, tap, catchError } from 'rxjs';
import { LoginRequest, RegisterRequest } from '../models/auth-requests.model';
import { AuthResponse } from '../models/auth-response.model';
import { User } from '../models/user.model';
import { ApiService } from '../../../core/api/api.service';


@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly TOKEN_KEY = 'access_token';
  private readonly USER_KEY = 'user_data';

  private currentUser = signal<User | null>(null);
  private isAuthenticated = signal<boolean>(false);

  constructor(
    private api: ApiService
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

  // /api/auth/sign-up
  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('/auth/sign-up', data).pipe(
      tap((response) => this.handleAuthSuccess(response)),
      catchError((error) => {
        throw error;
      })
    );
  }

  // /api/auth/sign-in
  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('/auth/sign-in', credentials).pipe(
      tap((response) => this.handleAuthSuccess(response)),
      catchError((error) => {
        this.logout();
        throw error;
      })
    );
  }

  // /api/auth/reset-password - TODO: Implementar endpoint
  
  // /api/auth/refresh
  refreshToken(): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('/auth/refresh', {}).pipe(
      tap((response) => this.handleAuthSuccess(response)),
      catchError((error) => {
        this.logout();
        throw error;
      })
    );
  }

  // /api/auth/logout 
  logout(): void {
    if (this.isBrowser()) {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    }
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
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
