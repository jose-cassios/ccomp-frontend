import { Injectable, signal } from '@angular/core';
import { Observable, catchError, finalize, map, of, switchMap, tap, throwError } from 'rxjs';
import { ForgotPasswordRequest, LoginRequest, RegisterRequest, ResetPasswordRequest } from '../models/auth-requests.model';
import { AuthResponse } from '../models/auth-response.model';
import { User } from '../models/user.model';
import { ApiService } from '../../../core/api/api.service';
import { AUTH_CONFIG } from '../config/auth.config';

interface JwtPayload {
  sub?: string;
  roles?: unknown;
  exp?: number;
}

interface CurrentUserResponse {
  id: string;
  name: string;
  email_address: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly currentUser = signal<User | null>(null);
  private readonly isAuthenticated = signal(false);
  readonly currentUserState = this.currentUser.asReadonly();
  readonly isAuthenticatedState = this.isAuthenticated.asReadonly();

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
    if (token && !this.isExpired(token)) {
      this.currentUser.set(this.getUserFromStorage() ?? this.getUserFromToken(token));
      this.isAuthenticated.set(true);
      if (!this.currentUser()?.name) {
        this.loadCurrentUser().subscribe({ error: () => undefined });
      }
      return;
    }

    this.clearSession();
  }

  // /api/auth/sign-up
  register(data: RegisterRequest): Observable<string> {
    return this.api.post<string>('/auth/sign-up', {
      name: data.name,
      email: data.email,
      password: data.password,
    });
  }

  // /api/auth/sign-in
  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('/auth/sign-in', credentials).pipe(
      tap((response) => this.handleAuthSuccess(response)),
      switchMap((response) =>
        this.loadCurrentUser().pipe(
          map(() => response),
          // A sessão continua válida caso a consulta opcional de dados falhe.
          catchError(() => of(response)),
        ),
      ),
      catchError((error) => {
        this.logout();
        throw error;
      })
    );
  }

  forgotPassword(data: ForgotPasswordRequest): Observable<void> {
    return this.api.post<void>('/auth/forgot-password', data);
  }

  resetPassword(data: ResetPasswordRequest): Observable<void> {
    return this.api.post<void>('/auth/reset-password', data);
  }
  
  // /api/auth/refresh
  refreshToken(): Observable<AuthResponse> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('Refresh token não disponível.'));
    }

    return this.api.post<AuthResponse>('/auth/refresh', { refresh_token: refreshToken }).pipe(
      tap((response) => this.handleAuthSuccess(response)),
      catchError((error) => {
        this.logout();
        throw error;
      })
    );
  }

  // /api/auth/logout 
  logout(): void {
    this.clearSession();
  }

  logoutRemote(): Observable<void> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.clearSession();
      return of(void 0);
    }

    return this.api.post<void>('/auth/logout', { refresh_token: refreshToken }).pipe(
      // Local logout must always happen, including when the token was already invalidated.
      finalize(() => this.clearSession()),
    );
  }


  getToken(): string | null {
    if (!this.isBrowser()) {
      return null;
    }
    return localStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    if (!this.isBrowser()) {
      return null;
    }
    return localStorage.getItem(AUTH_CONFIG.REFRESH_TOKEN_KEY);
  }

  getCurrentUser(): User | null {
    return this.currentUser();
  }

  get isAuthenticatedValue(): boolean {
    return this.isAuthenticated();
  }

  hasAnyRole(allowedRoles: readonly string[]): boolean {
    const allowed = new Set(allowedRoles.map((role) => this.normalizeRole(role)));
    return this.getCurrentRoles().some((role) => allowed.has(this.normalizeRole(role)));
  }

  getCurrentRoles(): string[] {
    const user = this.currentUser();
    if (user?.roles?.length) {
      return user.roles;
    }
    if (user?.role) {
      return [user.role];
    }

    const token = this.getToken();
    return token ? this.getRolesFromToken(token) : [];
  }

  loadCurrentUser(): Observable<User> {
    return this.api.get<CurrentUserResponse>('/users/me').pipe(
      map((response) => ({
        ...this.currentUser(),
        id: response.id,
        name: response.name,
        email: response.email_address,
        email_address: response.email_address,
      })),
      tap((user) => this.persistUser(user)),
    );
  }

  private handleAuthSuccess(response: AuthResponse): void {
    const token = response.accessToken ?? response.access_token;
    if (!token) {
      throw new Error('A API não retornou um access token válido.');
    }

    const refreshToken = response.refreshToken ?? response.refresh_token;
    const user = response.user ?? this.getUserFromToken(token) ?? this.currentUser();

    if (this.isBrowser()) {
      localStorage.setItem(AUTH_CONFIG.TOKEN_KEY, token);
      if (refreshToken) {
        localStorage.setItem(AUTH_CONFIG.REFRESH_TOKEN_KEY, refreshToken);
      }
      if (user) this.persistUser(user);
    }

    this.currentUser.set(user);
    this.isAuthenticated.set(true);
  }

  private getUserFromStorage(): User | null {
    if (!this.isBrowser()) {
      return null;
    }
    const userStr = localStorage.getItem(AUTH_CONFIG.USER_KEY);
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }

  private getUserFromToken(token: string): User | null {
    const payload = this.decodeToken(token);
    if (!payload?.sub) {
      return null;
    }

    return {
      id: payload.sub,
      roles: this.rolesFromClaim(payload.roles),
    };
  }

  private getRolesFromToken(token: string): string[] {
    return this.rolesFromClaim(this.decodeToken(token)?.roles);
  }

  private rolesFromClaim(claim: unknown): string[] {
    if (Array.isArray(claim)) {
      return claim.filter((role): role is string => typeof role === 'string');
    }
    return typeof claim === 'string' ? claim.split(/\s+/).filter(Boolean) : [];
  }

  private decodeToken(token: string): JwtPayload | null {
    if (!this.isBrowser()) {
      return null;
    }

    try {
      const encodedPayload = token.split('.')[1];
      if (!encodedPayload) {
        return null;
      }
      const normalized = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
      const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
      return JSON.parse(atob(normalized + padding)) as JwtPayload;
    } catch {
      return null;
    }
  }

  private isExpired(token: string): boolean {
    const expiration = this.decodeToken(token)?.exp;
    return typeof expiration === 'number' && expiration * 1000 <= Date.now();
  }

  private normalizeRole(role: string): string {
    const apiRole = role.replace(/^ROLE_/i, '').toUpperCase();
    // The API names these profiles ADMIN/STAFF; the product calls them ADM/MODERATOR.
    if (apiRole === 'ADMIN') {
      return 'ADM';
    }
    if (apiRole === 'STAFF') {
      return 'MODERATOR';
    }
    return apiRole;
  }

  private clearSession(): void {
    if (this.isBrowser()) {
      localStorage.removeItem(AUTH_CONFIG.TOKEN_KEY);
      localStorage.removeItem(AUTH_CONFIG.REFRESH_TOKEN_KEY);
      localStorage.removeItem(AUTH_CONFIG.USER_KEY);
    }
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
  }

  private persistUser(user: User): void {
    if (this.isBrowser()) {
      localStorage.setItem(AUTH_CONFIG.USER_KEY, JSON.stringify(user));
    }
    this.currentUser.set(user);
  }
}
