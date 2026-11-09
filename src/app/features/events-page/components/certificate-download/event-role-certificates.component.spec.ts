import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { EventRoleCertificatesComponent } from './event-role-certificates.component';
import { ActivityInstructorsService, Instructor } from '../../services/activity-instructors.service';
import { AuthService } from '../../../auth/services/auth.service';

describe('Event role certificates', () => {
  const api = { forEvent: vi.fn() };
  const auth = { currentUserState: () => ({ id: 'me' }), isAuthenticatedState: () => true };
  const rows: Instructor[] = [
    { id: 11, activity_id: 1, user_id: 'me', status: 'CONFIRMED', is_guest: false, name: 'Ana' },
    { id: 12, activity_id: 2, user_id: 'me', status: 'CONFIRMED', is_guest: false, name: 'Ana' },
    { id: 13, activity_id: 1, user_id: 'other', status: 'CONFIRMED', is_guest: false, name: 'Outro' },
    { id: 14, activity_id: 3, user_id: 'me', status: 'CANCELED', is_guest: false },
    { id: 15, activity_id: 1, user_id: 'me', status: 'CONFIRMED', is_guest: true },
    { id: 16, activity_id: 1, status: 'CONFIRMED', is_guest: false, name: 'Sem conta' },
  ];
  beforeEach(() => {
    vi.resetAllMocks(); api.forEvent.mockReturnValue(of(rows));
    TestBed.configureTestingModule({ imports: [EventRoleCertificatesComponent], providers: [provideRouter([]),
      { provide: ActivityInstructorsService, useValue: api }, { provide: AuthService, useValue: auth },
    ] });
  });
  function create(manage = false, teamMember = false) {
    const fixture = TestBed.createComponent(EventRoleCertificatesComponent);
    fixture.componentRef.setInput('eventId', 9); fixture.componentRef.setInput('manage', manage);
    fixture.componentRef.setInput('teamMember', teamMember); fixture.detectChanges(); return fixture;
  }
  it('shows one certificate for the signed-in instructor account, excluding guests and canceled links', () => {
    const fixture = create();
    expect(fixture.componentInstance.recipients().map(r => r.id)).toEqual([11]);
    expect(fixture.nativeElement.querySelectorAll('app-certificate-download')).toHaveLength(1);
    expect(fixture.nativeElement.textContent).not.toContain('Outro');
  });
  it('allows managers to see eligible accounts and explains profiles without an account', () => {
    const fixture = create(true, true);
    expect(fixture.componentInstance.recipients().map(r => r.id)).toEqual([11, 13, 16]);
    expect(fixture.nativeElement.textContent).toContain('Vincule uma conta ativa');
    expect(fixture.nativeElement.querySelectorAll('app-certificate-download')).toHaveLength(3);
  });
  it('does not render an unauthorized area for participants', () => {
    api.forEvent.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    const fixture = create();
    expect(fixture.nativeElement.querySelector('section')).toBeNull();
    expect(fixture.nativeElement.querySelector('[role=alert]')).toBeNull();
    expect(fixture.componentInstance.loading()).toBe(false);
  });
  it('shows a retry for request failures without fabricating certificate eligibility', () => {
    api.forEvent.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    const fixture = create();
    expect(fixture.nativeElement.querySelector('[role=alert]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-certificate-download')).toBeNull();
    api.forEvent.mockReturnValue(of(rows)); fixture.nativeElement.querySelector('button').click(); fixture.detectChanges();
    expect(fixture.componentInstance.error()).toBe(''); expect(fixture.componentInstance.recipients()).toHaveLength(1);
  });
});
