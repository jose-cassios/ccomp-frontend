import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-events-page',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './events-page.component.html',
  styleUrl: './events-page.component.css',
})
export class EventsPageComponent {
  // Mock
  evento = {
    sigla: 'SEMCOMP',
    modalidade: 'Presencial',
    titulo: 'V SEMANA DA COMPUTAÇÃO',
    descricao:
      'O maior desafio de programação do estado focado em sustentabilidade algorítmica. Três dias de imersão total para criar soluções que reduzam a pegada de carbono da infraestrutura digital local. Mentoria com especialistas do mercado e premiações exclusivas para os melhores protótipos.',
    data: '15-17 Out',
    horario: '08:00 AM',
    local: 'Auditório',
    vagas: 120,
    imagemUrl: 'ifma-logo.png',
    cargaHoraria: '48 Horas',
    certificado: true,
    publico: 'Acadêmicos',
    preRequisito: 'Lógica de Prog.',
  };

  inscrever(): void {
    // No MVP, redireciona para formulário simples
    console.log('Iniciando jornada de inscrição:');
  }
}
