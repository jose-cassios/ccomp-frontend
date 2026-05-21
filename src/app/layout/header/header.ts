import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-header',
  imports: [RouterModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  constructor(private router: Router) {}

  onLogin() {
    // No MVP, redireciona para a página de login com opções Google/Github
    this.router.navigate(['/login']); //[cite: 75, 99]
  }

  onSearch(term: string) {
    // Implementação da busca global (Requisito Funcional)
    console.log('Buscando por:', term); //[cite: 80]
  }
}
