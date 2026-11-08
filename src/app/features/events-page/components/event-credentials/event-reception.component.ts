import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EventCredentialsComponent } from './event-credentials.component';
@Component({ standalone: true, imports: [EventCredentialsComponent, RouterLink], template: `<main><a [routerLink]="['/eventos',id]">Voltar ao evento</a><h1>Recepção do evento</h1>@if(id>0){<app-event-credentials [eventId]="id"/>}@else{<p>Evento inválido.</p>}</main>`, styles: `main {max-width:900px;margin:auto;padding:24px 16px}h1 {font-size:1.5rem}` })
export class EventReceptionComponent {
    readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));
}
