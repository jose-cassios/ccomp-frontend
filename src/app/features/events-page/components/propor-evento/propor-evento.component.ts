import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-propor-evento',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './propor-evento.component.html',
  styleUrl: './propor-evento.component.css',
})
export class ProporEventoComponent {

constructor() {}
  onEnviarProposta(): void {
    console.log('Navegando para formulário de proposta...');

  }

  onVerDiretrizes(): void {
    console.log('Abrindo diretrizes do evento...');
  }
}
