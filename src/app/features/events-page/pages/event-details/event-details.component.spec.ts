import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { AuthService } from '../../../auth/services/auth.service';
import { EventDetails } from '../../models/event.model';
import { EventsService } from '../../services/events.service';
import { EventDetailsComponent } from './event-details.component';

describe('EventDetailsComponent', () => {
  let fixture: ComponentFixture<EventDetailsComponent>;

  const event: EventDetails = {
    id: 7,
    title: 'Encontro de Pesquisa',
    slug: 'encontro-de-pesquisa',
    summary: 'Apresentação de projetos e oportunidades de pesquisa.',
    content: 'Descrição completa da programação, das atividades e das informações para participação.',
    description: 'Descrição completa da programação, das atividades e das informações para participação.',
    cover_image_url: 'https://example.com/pesquisa.jpg',
    format: 'IN_PERSON',
    category: 'ACADEMIC_EDUCATIONAL',
    start_date: '2026-09-12T14:00:00',
    end_date: '2026-09-12T18:00:00',
    activities: [],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventDetailsComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: event.id }) } } },
        {
          provide: AuthService,
          useValue: { isAuthenticatedState: signal(false), hasAnyRole: () => false },
        },
        {
          provide: EventsService,
          useValue: {
            getById: () => of(event),
            getActivities: () => of({
              content: [{ id: 3, event_id: event.id, title: 'Abertura', description: null }],
              next_cursor: null,
            }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EventDetailsComponent);
    fixture.detectChanges();
  });

  it('should use the summary in the hero and keep the full content in the presentation', () => {
    expect(fixture.nativeElement.querySelector('.event-summary')?.textContent).toContain(event.summary);
    expect(fixture.nativeElement.querySelector('.event-description')?.textContent).toContain(event.content);
  });

  it('should render the event cover image', () => {
    const cover = fixture.nativeElement.querySelector('.event-hero__cover') as HTMLImageElement;
    expect(cover.src).toBe('https://example.com/pesquisa.jpg');
  });

  it('should load the schedule from the activities endpoint', () => {
    expect(fixture.nativeElement.textContent).toContain('Abertura');
  });
});
