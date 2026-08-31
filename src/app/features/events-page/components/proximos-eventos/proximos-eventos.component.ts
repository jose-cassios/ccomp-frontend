import { DatePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import {
  EVENT_CATEGORY_OPTIONS,
  EVENT_FORMAT_OPTIONS,
  EventCategory,
  EventFormat,
  EventListItem,
  eventCategoryLabel,
  eventFormatLabel,
} from '../../models/event.model';

@Component({
  selector: 'app-proximos-eventos',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './proximos-eventos.component.html',
  styleUrl: './proximos-eventos.component.css',
})
export class ProximosEventosComponent {
  readonly eventos = input.required<readonly EventListItem[]>();
  readonly heading = input('Todos os eventos');
  readonly showFilters = input(true);
  readonly draftMode = input(false);
  readonly selectedCategory = input<EventCategory | null>(null);
  readonly selectedFormat = input<EventFormat | null>(null);
  readonly hasMore = input(false);
  readonly loadingMore = input(false);
  readonly selected = output<number>();
  readonly categoryChanged = output<EventCategory | null>();
  readonly formatChanged = output<EventFormat | null>();
  readonly loadMore = output<void>();
  readonly categories = EVENT_CATEGORY_OPTIONS;
  readonly formats = EVENT_FORMAT_OPTIONS;
  readonly categoryLabel = eventCategoryLabel;
  readonly formatLabel = eventFormatLabel;
}
