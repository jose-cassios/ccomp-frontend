import { DatePipe } from '@angular/common';
import { EventCoverDirective } from '../event-cover.directive';
import { Component, input, output } from '@angular/core';
import { EventListItem, eventCategoryLabel, eventFormatLabel } from '../../models/event.model';

@Component({
  selector: 'app-evento-destaque',
  standalone: true,
  imports: [DatePipe, EventCoverDirective],
  templateUrl: './evento-destaque.component.html',
  styleUrl: './evento-destaque.component.css',
})
export class EventoDestaqueComponent {
  readonly evento = input.required<EventListItem>();
  readonly selected = output<number>();
  readonly categoryLabel = eventCategoryLabel;
  readonly formatLabel = eventFormatLabel;
}
