import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { NewsService } from '../news-page/services/news.service';
import { EventsService } from '../events-page/services/events.service';
import { AuthService } from '../auth/services/auth.service';
import { HeroHighlightsService } from './services/hero-highlights.service';

import { Home } from './home';

describe('Home', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideRouter([]),
        {
          provide: NewsService,
          useValue: { getAll: () => of({ content: [], next_cursor: null, previous_cursor: null }) },
        },
        {
          provide: EventsService,
          useValue: { search: () => of({ content: [], next_cursor: null, previous_cursor: null }) },
        },
        { provide: AuthService, useValue: { hasAnyRole: () => false } },
        { provide: HeroHighlightsService, useValue: { getAll: () => of([]) } },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads every events page and deduplicates overlapping results for the calendar', () => {
    const search = vi.spyOn(TestBed.inject(EventsService), 'search');
    const event = { id: 1, title: 'Encontro', slug: 'encontro', description: null,
      category: 'ACADEMIC_EDUCATIONAL' as const, format: 'ONLINE' as const,
      start_date: '2026-09-18T08:00:00', end_date: '2026-09-18T09:00:00' };
    search.mockReturnValueOnce(of({ content: [event], next_cursor: 'page2', previous_cursor: null }))
      .mockReturnValueOnce(of({ content: [event, { ...event, id: 2 }], next_cursor: null, previous_cursor: null }));
    component.loadEvents();
    expect(search).toHaveBeenNthCalledWith(2, {}, 'page2', 50);
    expect(component.events().map(item => item.id)).toEqual([1, 2]);
    expect(component.eventsLoading()).toBe(false);
  });

  it('reports loading failures and allows retrying', () => {
    const search = vi.spyOn(TestBed.inject(EventsService), 'search');
    search.mockReturnValueOnce(throwError(() => new Error('Network failure')))
      .mockReturnValueOnce(of({ content: [], next_cursor: null, previous_cursor: null }));
    component.loadEvents();
    expect(component.eventsError()).toBeTruthy();
    expect(component.eventsLoading()).toBe(false);
    component.loadEvents();
    expect(component.eventsError()).toBeNull();
  });
});
