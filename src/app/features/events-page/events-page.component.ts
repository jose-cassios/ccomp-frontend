import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventoDestaqueComponent } from './components/evento-destaque/evento-destaque.component';
import { ProximosEventosComponent } from './components/proximos-eventos/proximos-eventos.component'; 

@Component({
  selector: 'app-events-page',
  standalone: true,
  imports: [CommonModule, EventoDestaqueComponent, ProximosEventosComponent],
  templateUrl: './events-page.component.html',
  styleUrl: './events-page.component.css',
})
export class EventsPageComponent {

}
