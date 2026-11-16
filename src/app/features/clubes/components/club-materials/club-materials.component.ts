import { Component, EventEmitter, Input, Output } from '@angular/core';
import { EventMaterialsComponent } from '../../../events-page/components/event-materials/event-materials.component';
import { EventMaterialsService } from '../../../events-page/services/event-materials.service';
import { ClubMaterialsService } from '../../services/club-materials.service';

@Component({
  selector: 'app-club-materials',
  imports: [EventMaterialsComponent],
  providers: [{ provide: EventMaterialsService, useClass: ClubMaterialsService }],
  template: `<app-event-materials [eventId]="clubId" [manage]="manage" (working)="working.emit($event)"
    restrictedMessage="Os materiais estão disponíveis para membros ativos, participantes com participação concluída e gestores do clube." />`,
})
export class ClubMaterialsComponent {
  @Input({ required: true }) clubId!: number;
  @Input() manage = false;
  @Output() working = new EventEmitter<boolean>();
}
