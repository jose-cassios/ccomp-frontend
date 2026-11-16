import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { ParticipantCertificateComponent } from './participant-certificate.component';
import { CertificatesService } from '../../services/certificates.service';
import { EventsService } from '../../services/events.service';

describe('Manual participant certificate', () => {
  const certificates = { manualParticipant: vi.fn() };
  const events = { findEventEnrollment: vi.fn() };
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-15T18:00:00Z'));
    Object.defineProperty(URL, 'createObjectURL', { value: vi.fn(() => 'blob:certificate'), configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), configurable: true });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    events.findEventEnrollment.mockReturnValue(of({ id: 42, status: 'CHECKED_IN' }));
    certificates.manualParticipant.mockReturnValue(of(new Blob(['png'])));
    TestBed.configureTestingModule({ imports: [ParticipantCertificateComponent], providers: [
      { provide: CertificatesService, useValue: certificates }, { provide: EventsService, useValue: events },
    ] });
  });
  afterEach(() => vi.restoreAllMocks());
  function create(activity = false) {
    const fixture = TestBed.createComponent(ParticipantCertificateComponent);
    fixture.componentRef.setInput('eventId', 9); fixture.componentRef.setInput('allowed', true);
    fixture.componentRef.setInput('enrollment', { id: activity ? 100 : 42, status: 'CHECKED_IN', user: { id: 'user', name: 'Ana' } });
    fixture.componentRef.setInput('endDate', '2026-11-15T12:00:00'); fixture.componentRef.setInput('timeZone', 'America/Sao_Paulo');
    if (activity) fixture.componentRef.setInput('activityId', 7);
    fixture.detectChanges(); return fixture;
  }
  it('requires management access, attendance, completion and a non-canceled event', () => {
    const fixture = create(); expect(fixture.componentInstance.available()).toBe(true);
    for (const [field, value, reset] of [['allowed', false, true], ['endDate', '2026-11-16T12:00:00', '2026-11-15T12:00:00'], ['canceled', true, false]] as const) {
      fixture.componentRef.setInput(field, value); fixture.detectChanges();
      fixture.componentInstance.download(); expect(fixture.nativeElement.querySelector('button')).toBeNull();
      fixture.componentRef.setInput(field, reset);
    }
    fixture.componentRef.setInput('enrollment', { id: 42, status: 'CONFIRMED' }); fixture.detectChanges(); fixture.componentInstance.download();
    expect(certificates.manualParticipant).not.toHaveBeenCalled();
  });
  it('issues an event certificate with the selected enrollment and releases the file URL', () => {
    const fixture = create(); fixture.componentInstance.download();
    expect(events.findEventEnrollment).not.toHaveBeenCalled(); expect(certificates.manualParticipant).toHaveBeenCalledWith(9, 42, undefined);
    expect(fixture.componentInstance.success()).toContain('Download'); fixture.destroy(); expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:certificate');
  });
  it('resolves the event enrollment ID for an activity and prevents repeated requests', () => {
    const pending = new Subject<Blob>(); certificates.manualParticipant.mockReturnValue(pending);
    const fixture = create(true); const component = fixture.componentInstance; component.download(); component.download();
    expect(events.findEventEnrollment).toHaveBeenCalledWith(9, 'user'); expect(certificates.manualParticipant).toHaveBeenCalledExactlyOnceWith(9, 42, 7);
    pending.next(new Blob(['png'])); pending.complete(); expect(component.busy()).toBe(false);
  });
  it('shows the API rejection and permits a retry', () => {
    certificates.manualParticipant.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 403, error: { message: 'Presença não confirmada no evento.' } })));
    const component = create(true).componentInstance; component.download();
    expect(component.error()).toContain('Presença não confirmada'); expect(component.busy()).toBe(false);
    component.download(); expect(component.error()).toBe(''); expect(component.success()).toContain('Download');
  });
});
