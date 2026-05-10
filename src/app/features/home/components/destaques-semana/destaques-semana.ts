import { Component } from '@angular/core';
import { RouterLink } from "@angular/router";

interface Destaque{
  id: number;
  imagem: string;
  alt: string;
  titulo: string;
  descricao: string;
  rota: string;
}

@Component({
  selector: 'app-destaques-semana',
  imports: [RouterLink],
  templateUrl: './destaques-semana.html',
  styleUrl: './destaques-semana.css',
})
export class DestaquesSemana {

  destaques: Destaque[] = [
    {
      id: 1,
      imagem: 'inter.jpg',
      alt: 'Alunos em Portugal',
      titulo: 'Internacionalização: Alunos aprovados chegam em Portugal',
      descricao: 'A conquista marca um importante avanço na formação global e nas oportunidades profissionais dos estudantes que agora iniciam sua jornada acadêmica na Europa.',
      rota: '#'
    },
    {
      id: 2,
      imagem: 'ard.jpg',
      alt: 'Clube de Robótica',
      titulo: 'Inscrições do Clube de Robótica são liberadas',
      descricao: 'As turmas se destacam entre os turnos matutino e vespertino neste semestre, focando em competições nacionais e desenvolvimento de protótipos.',
      rota: '#'
    },
    {
      id: 3,
      imagem: 'Container.png',
      alt: 'Equipe FIRA',
      titulo: 'Equipes conquistam o primeiro lugar no FIRA Estadual 2026',
      descricao: 'A vitória reforça o protagonismo dos estudantes do IFMA em competições tecnológicas, garantindo vaga para a etapa nacional de robótica.',
      rota: '#'
    }
  ];
}
