import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

@Component({
  selector: 'app-proximos-eventos',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './proximos-eventos.component.html',
  styleUrl: './proximos-eventos.component.css',
})
export class ProximosEventosComponent {

  filtroAtivo = 'Todos';
  filtros = ['Todos', 'Palestras', 'Cursos'];

  //  3 itens na Home, ordenado por data
  eventos = [
    {
      id: 4,
      titulo: 'Workshop de Inteligência Artificial Generativa',
      descricao:
        'Explorando LLMs e integração de APIs inteligentes em aplicações modernas de Ciência da Computação.',
      data: '22/11/2025',
      inscritos: 45,
      statusClass: 'tag-aberto',
      status: 'Inscrições Abertas',
      imagemUrl: 'img1.png',
    },
    {
      id: 5,
      titulo: 'Palestra: Carreira em Dev Web no Mercado Global',
      descricao:
        'Estratégias para desenvolvedores brasileiros trabalharem para empresas do exterior.',
      data: '05/12/2025',
      local: 'Auditório Central',
      status: 'Em Breve',
      statusClass: 'tag-breve',
      imagemUrl: 'img2.png',
    },
    {
      id: 6,
      titulo: 'Seminário de Segurança da Informação e LGPD',
      descricao:
        'Entendendo as implicações jurídicas e técnicas da proteção de dados no ecossistema acadêmico.',
      data: '12/12/2025',
      vagasRestantes: 8,
      vagasTotal: 50,
      status: 'Últimas Vagas',
      statusClass: 'tag-urgente',
      imagemUrl: 'img3.png',
    },
  ];

  constructor(private router: Router) {}

  verDetalhes(id: number) {
    this.router.navigate(['/eventos', id]);
  }

  irParaCalendario() {
    this.router.navigate(['/eventos/calendario']);
  }
}
