import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { BannerComponent } from './banner.component';
import { EventListItem } from '../../../events-page/models/event.model';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiConfig } from '../../../../core/api/api.config';

describe('Banner', () => {
  let component: BannerComponent;
  let fixture: ComponentFixture<BannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BannerComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
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
  it('loads an event highlight cover from the API as an image blob', () => {
    const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:home-cover');
    const revokeUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const url = TestBed.inject(ApiConfig).buildUrl('/events/2/images/cover');
    fixture.componentRef.setInput('highlights', [{ id: 'EVENT:2', source_type: 'EVENT', source_id: 2,
      title: 'Semana', summary: 'Resumo', image_url: url, label: 'Evento em destaque', link: '/eventos/2' }]);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    const request = http.expectOne(url);
    expect(request.request.responseType).toBe('blob');
    request.flush(new Blob(['image'], { type: 'image/png' }));
    expect(fixture.nativeElement.querySelector('.news-img-container img').getAttribute('src')).toBe('blob:home-cover');
    fixture.destroy(); expect(revokeUrl).toHaveBeenCalledWith('blob:home-cover'); http.verify();
    createUrl.mockRestore(); revokeUrl.mockRestore();
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
