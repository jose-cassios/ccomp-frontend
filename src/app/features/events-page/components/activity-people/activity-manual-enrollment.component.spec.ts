import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { ActivityManualEnrollmentComponent } from './activity-manual-enrollment.component';
import { EventsService } from '../../services/events.service';
import { CredentialSearchItem, EventCredentialsService } from '../../services/event-credentials.service';

describe('Manual activity enrollment', () => {
  const person: CredentialSearchItem = { enrollment: { id: 42, status: 'CONFIRMED', user: { id: 'u', name: 'Ana' } }, eligible: true, credentialed: false };
  const api = { enrollActivityParticipant: vi.fn() }, lookup = { search: vi.fn() };
  beforeEach(() => {
    api.enrollActivityParticipant.mockReset().mockReturnValue(of({ message: 'Inscrição confirmada' }));
    lookup.search.mockReset().mockReturnValue(of([person]));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    TestBed.configureTestingModule({ imports: [ActivityManualEnrollmentComponent], providers: [
      { provide: EventsService, useValue: api }, { provide: EventCredentialsService, useValue: lookup }] });
  });
  afterEach(() => vi.restoreAllMocks());
  function setup(manage = true) {
    const fixture = TestBed.createComponent(ActivityManualEnrollmentComponent);
    fixture.componentRef.setInput('eventId', 1); fixture.componentRef.setInput('activityId', 3);
    fixture.componentRef.setInput('manage', manage); fixture.detectChanges(); return fixture.componentInstance;
  }
  it('blocks ordinary users, inactive enrollments and duplicate submissions', () => {
    const component = setup(false); component.term.setValue('Ana'); component.search(); component.enroll(person);
    expect(lookup.search).not.toHaveBeenCalled(); expect(api.enrollActivityParticipant).not.toHaveBeenCalled();
    component.manage = true; component.enroll({ ...person, eligible: false });
    expect(api.enrollActivityParticipant).not.toHaveBeenCalled();
    const pending = new Subject<{ message: string }>(); api.enrollActivityParticipant.mockReturnValueOnce(pending);
    component.enroll(person); component.enroll(person); expect(api.enrollActivityParticipant).toHaveBeenCalledOnce();
    pending.next({ message: 'OK' }); pending.complete(); component.enroll(person);
    expect(api.enrollActivityParticipant).toHaveBeenCalledWith(3, 42); expect(api.enrollActivityParticipant).toHaveBeenCalledOnce();
  });
  it('keeps search results on a capacity conflict and permits retry', () => {
    const component = setup(); const changed = vi.fn(); component.changed.subscribe(changed);
    component.term.setValue('Ana'); component.search();
    api.enrollActivityParticipant.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 409, error: { message: 'Vagas esgotadas.' } })));
    component.enroll(person);
    expect(component.error()).toBe('Vagas esgotadas.'); expect(component.results()).toEqual([person]); expect(changed).not.toHaveBeenCalled();
    component.enroll(person); expect(changed).toHaveBeenCalledOnce();
  });
});
