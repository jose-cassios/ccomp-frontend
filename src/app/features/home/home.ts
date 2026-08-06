import { Component } from '@angular/core';
import { BannerComponent } from "./components/banner/banner.component";
import { AgendaMesComponent } from "./components/agenda-mes/agenda-mes.component";
import { EventosAndamentoComponent } from "./components/eventos-andamento/eventos-andamento.component";
import { NoticiasClubeComponent } from "./components/noticias-clube/noticias-clube.component";
import { DestaquesSemana } from "./components/destaques-semana/destaques-semana";



@Component({
  selector: 'app-home',
  standalone:true,
  imports: [BannerComponent, AgendaMesComponent, EventosAndamentoComponent, DestaquesSemana, NoticiasClubeComponent],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {


}
