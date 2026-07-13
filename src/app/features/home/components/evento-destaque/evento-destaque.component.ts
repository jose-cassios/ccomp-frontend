import { Component } from '@angular/core';

interface DetalheEvento{
  label: string;
  value: string;
}

interface EventoDestaque{
  titulo: string;
  descricao:string;
  imagem: string;
  inscricoesAbertas:boolean;
  modalidade:string;
  detalhes:DetalheEvento[];
}

@Component({
  selector: 'app-evento-destaque',
  imports: [],
  templateUrl: './evento-destaque.component.html',
  styleUrl: './evento-destaque.component.css',
})
export class EventoDestaqueComponent {

  evento: EventoDestaque = {
    titulo: 'Hackathon IFMA 2026: Green Solutions',
    descricao: 'O maior evento de programação do IFMA, focado em sustentabilidade e algoritmos verdes. Traga sua mente criativa para encontrar soluções inovadoras.',
    imagem: '/img2.png', 
    inscricoesAbertas: true,
    modalidade: 'PRESENCIAL',
    detalhes: [
      { label: 'DATA', value: '10-12 Out' },
      { label: 'VAGAS', value: '40 Equipes' },
      { label: 'LOCAL', value: 'Auditório II' },
      { label: 'STATUS', value: 'Disponível' }
    ]
  };

}
