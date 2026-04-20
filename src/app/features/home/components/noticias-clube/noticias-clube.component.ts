import { Component } from '@angular/core';

interface NoticiaDestaque {
  categoria: string;
  tituloCard: string;
  descricao: string;
  imagem: string;
  labelSessao: string;
  tituloPrincipal: string;
}

@Component({
  selector: 'app-noticias-clube',
  imports: [],
  templateUrl: './noticias-clube.component.html',
  styleUrl: './noticias-clube.component.css',
})
export class NoticiasClubeComponent {

  noticia: NoticiaDestaque = {
    categoria: 'ESTRATÉGIA',
    tituloCard: 'Clube de Jogos',
    descricao: 'Estratégia, lógica e foco. Organizamos torneios semanais e sessões de estudo de táticas avançadas para mentes competitivas.',
    imagem: '/Container.png',
    labelSessao: 'Clubes',
    tituloPrincipal: 'Estão abertas as inscrições para o Clube de Jogos!'
  };

}
