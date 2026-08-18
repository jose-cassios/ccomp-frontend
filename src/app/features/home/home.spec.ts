import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
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
        { provide: HeroHighlightsService, useValue: { getAll: () => of([]), getCandidates: () => of([]), update: () => of([]) } },
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
});
