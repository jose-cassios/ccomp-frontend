import { Component, computed, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EventListItem, eventCategoryLabel } from '../../../events-page/models/event.model';

interface CalendarEvent {
  event: EventListItem;
  start: Date;
  end: Date;
}
interface CalendarDay {
  key: string;
  date: Date;
  inMonth: boolean;
  today: boolean;
  label: string;
  events: CalendarEvent[];
}

@Component({
  selector: 'app-agenda-mes',
  imports: [RouterLink],
  templateUrl: './agenda-mes.component.html',
  styleUrl: './agenda-mes.component.css',
})
export class AgendaMesComponent {
  readonly events = input<readonly EventListItem[]>([]);
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly retry = output<void>();
  readonly today = this.dayStart(new Date());
  readonly month = signal(new Date(this.today.getFullYear(), this.today.getMonth(), 1));
  readonly selectedDate = signal(this.today);
  readonly weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  readonly categoryLabel = eventCategoryLabel;
  private readonly timeFormatter = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
  private readonly dayFormatter = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  readonly monthLabel = computed(() =>
    new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(this.month()),
  );
  readonly normalizedEvents = computed<CalendarEvent[]>(() => {
    const unique = new Map(this.events().map(event => [event.id, event]));
    return [...unique.values()].flatMap(event => {
      if (!event.start_date) return [];
      const start = new Date(event.start_date);
      if (!Number.isFinite(start.getTime())) return [];
      const suppliedEnd = event.end_date ? new Date(event.end_date) : start;
      const end = Number.isFinite(suppliedEnd.getTime()) && suppliedEnd >= start ? suppliedEnd : start;
      return [{ event, start, end }];
    }).sort((a, b) => a.start.getTime() - b.start.getTime() || a.event.id - b.event.id);
  });
  readonly days = computed<CalendarDay[]>(() => {
    const month = this.month();
    const total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const cells = Math.ceil((month.getDay() + total) / 7) * 7;
    return Array.from({ length: cells }, (_, index) => {
      const date = new Date(month.getFullYear(), month.getMonth(), index - month.getDay() + 1);
      const events = this.eventsOn(date);
      return {
        key: this.dateKey(date), date,
        inMonth: date.getMonth() === month.getMonth(),
        today: date.getTime() === this.today.getTime(),
        label: this.dayFormatter.format(date) + ': ' + events.length + (events.length === 1 ? ' evento' : ' eventos'),
        events,
      };
    });
  });
  readonly monthCount = computed(() =>
    new Set(this.days().filter(day => day.inMonth).flatMap(day => day.events.map(item => item.event.id))).size,
  );
  readonly selectedEvents = computed(() => this.eventsOn(this.selectedDate()));
  readonly selectedLabel = computed(() => this.dayFormatter.format(this.selectedDate()));

  changeMonth(offset: number): void {
    const current = this.month();
    const next = new Date(current.getFullYear(), current.getMonth() + offset, 1);
    this.month.set(next);
    this.selectedDate.set(next);
  }

  goToToday(): void {
    this.month.set(new Date(this.today.getFullYear(), this.today.getMonth(), 1));
    this.selectedDate.set(this.today);
  }

  selectDay(day: CalendarDay): void {
    this.selectedDate.set(day.date);
  }

  isSelected(day: CalendarDay): boolean {
    return day.date.getTime() === this.selectedDate().getTime();
  }

  timeLabel(item: CalendarEvent, date: Date): string {
    return this.dayStart(item.start) < date ? 'Em andamento' : this.timeFormatter.format(item.start);
  }

  intervalLabel(item: CalendarEvent): string {
    const start = this.timeFormatter.format(item.start);
    const end = this.timeFormatter.format(item.end);
    if (this.dateKey(item.start) === this.dateKey(item.end)) return start === end ? start : start + ' – ' + end;
    const format = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });
    return format.format(item.start) + ', ' + start + ' até ' + format.format(item.end) + ', ' + end;
  }

  private eventsOn(date: Date): CalendarEvent[] {
    const nextDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    // End is exclusive: an event ending at midnight does not occupy the following day.
    return this.normalizedEvents().filter(item =>
      item.start < nextDay && (item.end > date || item.start.getTime() === date.getTime()),
    );
  }

  private dayStart(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private dateKey(date: Date): string {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }
}
