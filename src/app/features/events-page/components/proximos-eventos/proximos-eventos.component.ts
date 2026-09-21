import { DatePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import {
  EVENT_CATEGORY_OPTIONS,
  EVENT_EXECUTION_FILTER_OPTIONS,
  EVENT_FORMAT_OPTIONS,
  EventCategory,
  EventExecutionStatus,
  EventFormat,
  EventListItem,
  eventCategoryLabel,
  eventFormatLabel,
  eventPublicationStatusLabel,
} from '../../models/event.model';

@Component({
  selector: 'app-proximos-eventos',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './proximos-eventos.component.html',
  styleUrls: ['./proximos-eventos.component.css', './proximos-eventos-agenda.css'],
})
export class ProximosEventosComponent {
  readonly eventos = input.required<readonly EventListItem[]>();
  readonly heading = input('Todos os eventos');
  readonly showFilters = input(true);
  readonly manageMode = input(false);
  readonly compactMode = input(false);
  readonly agendaMode = input(false);
  readonly emptyMessage = input('Nenhum evento programado.');
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  readonly selectedCategory = input<EventCategory | null>(null);
  readonly selectedFormat = input<EventFormat | null>(null);
  readonly selectedExecutionStatus = input<EventExecutionStatus | null>(null);
  readonly hasMore = input(false);
  readonly loadingMore = input(false);
  readonly selected = output<number>();
  readonly categoryChanged = output<EventCategory | null>();
  readonly formatChanged = output<EventFormat | null>();
  readonly executionStatusChanged = output<EventExecutionStatus | null>();
  readonly loadMore = output<void>();
  readonly categories = EVENT_CATEGORY_OPTIONS;
  readonly formats = EVENT_FORMAT_OPTIONS;
  readonly executionStatuses = EVENT_EXECUTION_FILTER_OPTIONS;
  readonly categoryLabel = eventCategoryLabel;
  readonly formatLabel = eventFormatLabel;
  readonly publicationStatusLabel = eventPublicationStatusLabel;
  monthLabel(date: string | null): string {
    return date ? this.months[new Date(date).getMonth()] : '';
  }
}
