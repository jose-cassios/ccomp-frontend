import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class Footer {
  readonly currentYear = signal(new Date().getFullYear());

  readonly quickLinks = [
    { label: 'Eventos', path: '/eventos' },
    { label: 'O Curso', path: '/curso' },
    { label: 'Projetos', path: '/projetos' },
    { label: 'Clubes', path: '/clubes' },
  ];
}
