import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { ActivityManualEnrollmentComponent } from './activity-manual-enrollment.component';
import { EventsService } from '../../services/events.service';
import { CredentialSearchItem, EventCredentialsService } from '../../services/event-credentials.service';

describe('Manual activity enrollment', () => {
  const person: CredentialSearchItem = { enrollment: { id: 42, status: 'CONFIRMED', user: { id: 'u', name: 'Ana' } }, eligible: true, credentialed: false };
  const api = { enrollActivityParticipant: vi.fn(), markActivityAttendance: vi.fn() }, lookup = { search: vi.fn() };
  beforeEach(() => {
    api.enrollActivityParticipant.mockReset().mockReturnValue(of({ message: 'Inscrição confirmada' }));
    api.markActivityAttendance.mockReset().mockReturnValue(of({ message: 'Presença confirmada' }));
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
  it('confirms attendance separately after enrollment using the event enrollment ID', () => {
    const component = setup(); const changed = vi.fn(); component.changed.subscribe(changed);
    component.confirmAttendance(person);
    expect(api.markActivityAttendance).not.toHaveBeenCalled();
    component.enroll(person);
    expect(api.markActivityAttendance).not.toHaveBeenCalled();
    const pending = new Subject<{ message: string }>(); api.markActivityAttendance.mockReturnValueOnce(pending);
    component.confirmAttendance(person); component.confirmAttendance(person);
    expect(api.markActivityAttendance).toHaveBeenCalledOnce();
    expect(api.markActivityAttendance).toHaveBeenCalledWith(3, 42);
    expect(component.attended().has(42)).toBe(false);
    pending.next({ message: 'Presença confirmada' }); pending.complete();
    expect(component.attended().has(42)).toBe(true); expect(changed).toHaveBeenCalledTimes(2);
    component.confirmAttendance(person); expect(api.markActivityAttendance).toHaveBeenCalledOnce();
  });
  it('keeps the enrollment and allows retry when attendance fails, respecting permissions', () => {
    const component = setup(); component.enroll(person);
    component.manage = false; component.confirmAttendance(person);
    expect(api.markActivityAttendance).not.toHaveBeenCalled();
    component.manage = true;
    api.markActivityAttendance.mockReturnValueOnce(throwError(() => new Error('offline')));
    component.confirmAttendance(person);
    expect(component.added().has(42)).toBe(true); expect(component.attended().has(42)).toBe(false);
    expect(component.error()).toBeTruthy(); expect(component.busy()).toBe(false);
    component.confirmAttendance(person); expect(component.attended().has(42)).toBe(true);
  });
});
