import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '../auth/services/auth.service';
import { EventsPageComponent } from './events-page.component';
import { EventListItem } from './models/event.model';
import { EventsService } from './services/events.service';

describe('EventsPageComponent', () => {
  let component: EventsPageComponent;
  let fixture: ComponentFixture<EventsPageComponent>;
  const catalog: EventListItem[] = [
    {
      id: 1,
      title: 'Evento passado',
      slug: 'evento-passado',
      description: null,
      category: 'ACADEMIC_EDUCATIONAL',
      format: 'IN_PERSON',
      start_date: '2025-01-10T08:00:00',
      end_date: '2025-01-10T12:00:00',
    },
    {
      id: 2,
      title: 'Evento futuro',
      slug: 'evento-futuro',
      description: null,
      category: 'ACADEMIC_EDUCATIONAL',
      format: 'ONLINE',
      start_date: '2027-01-10T08:00:00',
      end_date: '2027-01-10T12:00:00',
    },
  ];
  const eventsService = {
    search: vi.fn(() => of({ content: catalog, next_cursor: null, previous_cursor: null })),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventsPageComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { hasAnyRole: () => false } },
        {
          provide: EventsService,
          useValue: eventsService,
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(EventsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should keep past, ongoing and future events in the public catalog', () => {
    expect(eventsService.search).toHaveBeenCalledWith({});
    expect(component.events()).toEqual(catalog);
    expect(fixture.nativeElement.textContent).toContain('Evento passado');
    expect(fixture.nativeElement.textContent).toContain('Evento futuro');
  });

  it('should not show the public event proposal call to action', () => {
    expect(fixture.nativeElement.textContent).not.toContain('Quer propor um evento ou palestra?');
    expect(fixture.nativeElement.querySelector('a[href="/eventos/novo"]')).toBeNull();
  });
});
