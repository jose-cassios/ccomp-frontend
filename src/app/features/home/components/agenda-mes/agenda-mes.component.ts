import { Component } from '@angular/core';

interface AgendaItem{
  day: string;
  month: string;
  tag: string;
  title:string;
}

@Component({
  selector: 'app-agenda-mes',
  imports: [],
  templateUrl: './agenda-mes.component.html',
  styleUrl: './agenda-mes.component.css',
})
export class AgendaMesComponent {

  agendaMes: AgendaItem[] = [
    { day: '15', month: 'SET', tag: 'PALESTRA', title: 'Palestra de Abertura do Semestre' },
    { day: '22', month: 'SET', tag: 'ACADÊMICO', title: 'Reunião do Colegiado' },
    { day: '30', month: 'SET', tag: 'IMPORTANTE', title: 'Prazo final para inscrições em Monitoria' },
  ];

}
