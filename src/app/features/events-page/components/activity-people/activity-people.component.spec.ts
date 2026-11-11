import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { EventsService } from '../../services/events.service';
import { ActivityPeopleComponent } from './activity-people.component';

describe('Private activity enrollment list', () => {
  const api = { getActivityEnrollments: vi.fn(), findEventEnrollment: vi.fn(), markActivityAttendance: vi.fn() };
  beforeEach(() => {
    api.getActivityEnrollments.mockReset();
    api.findEventEnrollment.mockReset().mockReturnValue(of({ id: 42, status: 'CONFIRMED', user: { id: 'u' } }));
    api.markActivityAttendance.mockReset().mockReturnValue(of({ message: 'Confirmada' }));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    TestBed.configureTestingModule({ imports: [ActivityPeopleComponent], providers: [{ provide: EventsService, useValue: api }] });
  });
  afterEach(() => vi.restoreAllMocks());
  function setup(manage: boolean) {
    const fixture = TestBed.createComponent(ActivityPeopleComponent);
    fixture.componentRef.setInput('eventId', 1); fixture.componentRef.setInput('activityId', 3);
    fixture.componentRef.setInput('manage', manage); fixture.detectChanges(); return fixture;
  }
  it('neither displays nor requests participant data for ordinary users', () => {
    const fixture = setup(false); fixture.componentInstance.load();
    expect(api.getActivityEnrollments).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).not.toContain('Inscritos da atividade');
  });
  it('resolves the event enrollment before attendance and prevents repeated confirmation', () => {
    const component = setup(true).componentInstance;
    const row = { id: 999, status: 'CONFIRMED' as const, created_at: null, user: { id: 'u', name: 'Ana', email_address: 'ana@example.com' } };
    component.rows.set([row]);
    const pending = new Subject<{ message: string }>(); api.markActivityAttendance.mockReturnValueOnce(pending);
    component.markAttendance(row); component.markAttendance(row);
    expect(api.findEventEnrollment).toHaveBeenCalledWith(1, 'u');
    expect(api.markActivityAttendance).toHaveBeenCalledOnce(); expect(api.markActivityAttendance).toHaveBeenCalledWith(3, 42);
    pending.next({ message: 'Presença confirmada' }); pending.complete();
    expect(component.rows()[0].status).toBe('CHECKED_IN'); expect(component.attendingId()).toBeNull();
    component.markAttendance(component.rows()[0]); expect(api.markActivityAttendance).toHaveBeenCalledOnce();
  });
  it('does not claim attendance after a failed request', () => {
    const component = setup(true).componentInstance;
    const row = { id: 999, status: 'CONFIRMED' as const, created_at: null, user: { id: 'u', name: 'Ana', email_address: '' } };
    component.rows.set([row]); api.markActivityAttendance.mockReturnValueOnce(throwError(() => new Error('offline')));
    component.markAttendance(row); expect(component.rows()[0].status).toBe('CONFIRMED'); expect(component.error()).toBeTruthy();
    component.manage = false; api.findEventEnrollment.mockClear(); component.markAttendance(row);
    expect(api.findEventEnrollment).not.toHaveBeenCalled();
  });
  it('loads the list on expansion and appends the next cursor page', () => {
    const row = { id: 1, status: 'CHECKED_IN', user: { name: 'Ana', email_address: 'ana@example.com' } };
    api.getActivityEnrollments.mockReturnValueOnce(of({ content: [row], next_cursor: 'next' }))
      .mockReturnValueOnce(of({ content: [{ ...row, id: 2 }], next_cursor: null }));
    const fixture = setup(true);
    expect(api.getActivityEnrollments).not.toHaveBeenCalled();
    fixture.componentInstance.openEnrollments(true); fixture.componentInstance.load(true); fixture.detectChanges();
    expect(api.getActivityEnrollments).toHaveBeenLastCalledWith(3, 'next');
    expect(fixture.componentInstance.rows()).toHaveLength(2);
    expect(fixture.nativeElement.textContent).toContain('Ana');
  });
});
