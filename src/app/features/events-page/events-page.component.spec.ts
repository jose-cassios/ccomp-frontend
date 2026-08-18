import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AuthService } from '../auth/services/auth.service';
import { EventsPageComponent } from './events-page.component';
import { EventsService } from './services/events.service';

describe('EventsPageComponent', () => {
  let component: EventsPageComponent;
  let fixture: ComponentFixture<EventsPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventsPageComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { hasAnyRole: () => false } },
        {
          provide: EventsService,
          useValue: {
            search: () => of({ content: [], next_cursor: null, previous_cursor: null }),
            getFeatured: () => throwError(() => ({ status: 404 })),
          },
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

  it('should not show the public event proposal call to action', () => {
    expect(fixture.nativeElement.textContent).not.toContain('Quer propor um evento ou palestra?');
    expect(fixture.nativeElement.querySelector('a[href="/eventos/novo"]')).toBeNull();
  });
});
