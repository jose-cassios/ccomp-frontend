import { Component, computed, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
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

  readonly canAccessAdministration = computed(() => this.authService.hasAnyRole(['ADM']));

  onLogin() {
    // No MVP, redireciona para a página de login com opções Google/Github
    this.router.navigate(['/login']); //[cite: 75, 99]
  }

  onSearch(term: string) {
    // Implementação da busca global (Requisito Funcional)
    console.log('Buscando por:', term); //[cite: 80]
  }
}
