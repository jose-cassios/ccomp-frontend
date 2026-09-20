import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { BannerComponent } from './banner.component';
import { EventListItem } from '../../../events-page/models/event.model';

describe('Banner', () => {
  let component: BannerComponent;
  let fixture: ComponentFixture<BannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BannerComponent],
      providers: [provideRouter([])],
    })
    .compileComponents();

    fixture = TestBed.createComponent(BannerComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should always render the default hero card when no global highlight is configured', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.news-card')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Semana de Tecnologia');
  });

  it('should expose highlight management only when the caller grants permission', () => {
    fixture.componentRef.setInput('canManageHighlights', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Gerenciar destaques');
  });

  const event = (id: number, start: string, end = start): EventListItem => ({
    id, title: 'Evento ' + id, slug: 'evento-' + id, description: null,
    category: 'ACADEMIC_EDUCATIONAL', format: 'IN_PERSON',
    start_date: start, end_date: end,
  });

  it('lists upcoming events chronologically without past or canceled events', () => {
    fixture.componentRef.setInput('events', [
      event(2, '2099-09-19T12:00:00'),
      event(1, '2099-09-18T08:00:00'),
      event(3, '2000-01-01T08:00:00'),
      { ...event(4, '2099-09-18T10:00:00'), status: 'CANCELED' },
    ]);
    expect(component.agendaEvents().map(item => item.id)).toEqual([1, 2]);
  });

  it('filters a selected day including ongoing events but excluding midnight endings', () => {
    fixture.componentRef.setInput('events', [
      event(1, '2026-09-17T08:00:00', '2026-09-18T00:00:00'),
      event(2, '2026-09-17T08:00:00', '2026-09-19T00:00:00'),
      event(3, '2026-09-18T10:00:00'),
      event(4, '2026-09-19T10:00:00'),
    ]);
    component.selectedDay.set(new Date(2026, 8, 18));
    expect(component.agendaEvents().map(item => item.id)).toEqual([2, 3]);
    expect(component.panelTitle()).toBe('Eventos em 18/09');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.agenda-event')).toHaveLength(2);
    expect(fixture.nativeElement.querySelector('.day-details')).toBeNull();
  });
});
