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
    description: 'Apresentação de projetos e oportunidades de pesquisa.',
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
          useValue: { getById: () => of(event), getSubscriptions: () => of([]) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EventDetailsComponent);
    fixture.detectChanges();
  });

  it('should render the event description returned by the API adapter', () => {
    expect(fixture.nativeElement.querySelector('.event-description')?.textContent).toContain(event.description);
  });

  it('should render the event cover image', () => {
    const cover = fixture.nativeElement.querySelector('.event-hero__cover') as HTMLImageElement;
    expect(cover.src).toBe('https://example.com/pesquisa.jpg');
  });
});
