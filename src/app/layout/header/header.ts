import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ADMINISTRATION_ROLES } from '../../features/auth/config/auth.config';
import { AuthService } from '../../features/auth/services/auth.service';

@Component({
  selector: 'app-header',
  imports: [RouterModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  private readonly authService = inject(AuthService);

  constructor(private router: Router) {}

  readonly canAccessAdministration = computed(() =>
    this.authService.hasAnyRole(ADMINISTRATION_ROLES),
  );
  readonly currentUser = this.authService.currentUserState;
  readonly isAuthenticated = this.authService.isAuthenticatedState;
  readonly isLoggingOut = signal(false);
  readonly userInitials = computed(() => {
    const name = this.currentUser()?.name?.trim();
    return name ? name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() : 'US';
  });

  onLogin() {
    // No MVP, redireciona para a página de login com opções Google/Github
    this.router.navigate(['/login']); //[cite: 75, 99]
  }

  logout(): void {
    if (this.isLoggingOut()) return;
    this.isLoggingOut.set(true);
    this.authService.logoutRemote().subscribe({
      next: () => this.router.navigate(['/']),
      error: () => {
        this.isLoggingOut.set(false);
        this.router.navigate(['/']);
      },
      complete: () => this.isLoggingOut.set(false),
    });
  }

  onSearch(term: string) {
    // Implementação da busca global (Requisito Funcional)
    console.log('Buscando por:', term); //[cite: 80]
  }
}
