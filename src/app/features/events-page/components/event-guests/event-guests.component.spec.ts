import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { EventGuestsComponent } from './event-guests.component';
import { EventGuestsService } from '../../services/event-guests.service';
import { AuthService } from '../../../auth/services/auth.service';

describe('Guest visibility', () => {
  const service = { guests: vi.fn() };
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([]),
    { provide: EventGuestsService, useValue: service },
    { provide: AuthService, useValue: { getCurrentUser: () => null } },
  ] }));
  function create() {
    const fixture = TestBed.createComponent(EventGuestsComponent);
    fixture.componentRef.setInput('eventId', 1); fixture.detectChanges(); return fixture;
  }
  for (const status of [401, 403]) it(`hides the whole panel on ${status}`, () => {
    service.guests.mockReturnValue(throwError(() => new HttpErrorResponse({ status })));
    const fixture = create();
    expect(fixture.nativeElement.querySelector('.guest-panel')).toBeNull();
    expect(fixture.nativeElement.textContent.trim()).toBe('');
  });
  it('keeps retry feedback for transient failures', () => {
    service.guests.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    const fixture = create();
    expect(fixture.nativeElement.querySelector('[role=alert]')).not.toBeNull();
    service.guests.mockReturnValue(of({ content: [], next_cursor: null }));
    fixture.componentInstance.loadGuests(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=alert]')).toBeNull();
    expect(fixture.nativeElement.querySelector('.guest-panel')).not.toBeNull();
  });
});
