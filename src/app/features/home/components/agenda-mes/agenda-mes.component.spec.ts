import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AgendaMesComponent } from './agenda-mes.component';
import { EventListItem } from '../../../events-page/models/event.model';

describe('AgendaMesComponent', () => {
  let component: AgendaMesComponent;
  let fixture: ComponentFixture<AgendaMesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgendaMesComponent],
      providers: [provideRouter([])],
    })
    .compileComponents();

    fixture = TestBed.createComponent(AgendaMesComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  const event = (id: number, start: string, end: string | null = start): EventListItem => ({
    id, title: 'Evento ' + id, slug: 'evento-' + id, description: null,
    category: 'ACADEMIC_EDUCATIONAL', format: 'IN_PERSON',
    start_date: start, end_date: end,
  });

  it('renders every day of a leap month in complete Sunday-to-Saturday weeks', () => {
    component.month.set(new Date(2028, 1, 1));
    const days = component.days();
    expect(days.filter(day => day.inMonth)).toHaveLength(29);
    expect(days.length % 7).toBe(0);
    expect(days[0].date.getDay()).toBe(0);
    expect(days.at(-1)?.date.getDay()).toBe(6);
  });

  it('orders events by local time and excludes invalid dates without limiting the list to three', () => {
    component.month.set(new Date(2026, 8, 1));
    fixture.componentRef.setInput('events', [
      event(4, '2026-09-18T16:00:00'),
      event(2, '2026-09-18T10:00:00'),
      event(1, '2026-09-18T08:00:00'),
      event(3, '2026-09-18T10:00:00'),
      event(5, 'invalid'),
    ]);
    const day = component.days().find(day => day.key === '2026-09-18')!;
    component.selectDay(day);
    expect(component.selectedEvents().map(item => item.event.id)).toEqual([1, 2, 3, 4]);
    expect(component.timeLabel(day.events[0], day.date)).toBe('08:00');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.day-detail')).toHaveLength(4);
    expect(fixture.nativeElement.querySelector('.more-events').textContent).toContain('+1');
  });

  it('spans month boundaries and does not occupy a day when ending exactly at midnight', () => {
    component.month.set(new Date(2026, 8, 1));
    fixture.componentRef.setInput('events', [
      event(1, '2026-08-31T18:00:00', '2026-09-03T00:00:00'),
    ]);
    const first = component.days().find(day => day.key === '2026-09-01')!;
    expect(first.events).toHaveLength(1);
    expect(component.timeLabel(first.events[0], first.date)).toBe('Em andamento');
    expect(component.days().find(day => day.key === '2026-09-02')?.events).toHaveLength(1);
    expect(component.days().find(day => day.key === '2026-09-03')?.events).toHaveLength(0);
    expect(component.monthCount()).toBe(1);
  });

  it('moves across years and returns to the current day', () => {
    component.month.set(new Date(2026, 11, 1));
    component.changeMonth(1);
    expect(component.month().getFullYear()).toBe(2027);
    expect(component.month().getMonth()).toBe(0);
    component.changeMonth(-1);
    expect(component.month().getMonth()).toBe(11);
    component.goToToday();
    expect(component.selectedDate()).toEqual(component.today);
    expect(component.days().find(day => day.today)).toBeDefined();
  });
});
