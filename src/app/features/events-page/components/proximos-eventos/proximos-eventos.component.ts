import { DatePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import {
  EVENT_CATEGORY_OPTIONS,
  EVENT_FORMAT_OPTIONS,
  EVENT_TIMING_OPTIONS,
  EventCategory,
  EventFormat,
  EventListItem,
  EventTiming,
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
  readonly selectedCategory = input<EventCategory | null>(null);
  readonly selectedFormat = input<EventFormat | null>(null);
  readonly selectedTiming = input<EventTiming | null>(null);
  readonly hasMore = input(false);
  readonly loadingMore = input(false);
  readonly selected = output<number>();
  readonly categoryChanged = output<EventCategory | null>();
  readonly formatChanged = output<EventFormat | null>();
  readonly timingChanged = output<EventTiming | null>();
  readonly loadMore = output<void>();
  readonly categories = EVENT_CATEGORY_OPTIONS;
  readonly formats = EVENT_FORMAT_OPTIONS;
  readonly timings = EVENT_TIMING_OPTIONS;
  readonly categoryLabel = eventCategoryLabel;
  readonly formatLabel = eventFormatLabel;
}
