import { DatePipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EventListItem, eventCategoryLabel } from '../../../events-page/models/event.model';

@Component({
  selector: 'app-agenda-mes',
  imports: [DatePipe, RouterLink],
  templateUrl: './agenda-mes.component.html',
  styleUrl: './agenda-mes.component.css',
})
export class AgendaMesComponent {
  readonly events = input<readonly EventListItem[]>([]);
  readonly agendaMes = computed(() => this.events().slice(0, 3));
  readonly categoryLabel = eventCategoryLabel;
}
