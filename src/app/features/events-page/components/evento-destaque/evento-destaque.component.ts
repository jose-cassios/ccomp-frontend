import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-evento-destaque',
  imports: [MatIconModule],
  templateUrl: './evento-destaque.component.html',
  styleUrl: './evento-destaque.component.css',
})
export class EventoDestaqueComponent {
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
    imagemUrl: 'semana-comp.png',
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
