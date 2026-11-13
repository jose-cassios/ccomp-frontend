import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { CertificateManualManagementComponent } from './certificate-manual-management.component';
import { CertificatesService } from '../../services/certificates.service';
import { EventsService } from '../../services/events.service';
import { ActivityInstructorsService } from '../../services/activity-instructors.service';
import { EventGuestsService } from '../../services/event-guests.service';

describe('Manual certificate management', () => {
  const api = { manualInstructor: vi.fn(), manualTeam: vi.fn(), manualContent: vi.fn(), guestCertificate: vi.fn(), download: vi.fn(), instructorActivityCertificate: vi.fn() };
  const events = { getEditors: vi.fn(), getAllActivities: vi.fn() };
  const instructors = { forEvent: vi.fn() }, guests = { allGuests: vi.fn() };
  beforeEach(() => {
    vi.resetAllMocks();
    Object.defineProperty(URL, 'createObjectURL', { value: vi.fn(() => 'blob:result'), configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), configurable: true });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    for (const fn of Object.values(api)) fn.mockReturnValue(of(new Blob()));
    events.getEditors.mockReturnValue(of({ content: [{ id: 1, name: 'Editor', active: true, user_id: 'editor' }], next_cursor: null }));
    events.getAllActivities.mockReturnValue(of([{ id: 5, title: 'Oficina' }]));
    instructors.forEvent.mockReturnValue(of([{ id: 42, activity_id: 5, status: 'CONFIRMED', name: 'Ana' }]));
    guests.allGuests.mockReturnValue(of([{ id: 8, event_guest_id: 99, name: 'Convidado', status: 'CONFIRMED', role: 'PRESENTER' }]));
    TestBed.configureTestingModule({ imports: [CertificateManualManagementComponent], providers: [
      { provide: CertificatesService, useValue: api }, { provide: EventsService, useValue: events },
      { provide: ActivityInstructorsService, useValue: instructors }, { provide: EventGuestsService, useValue: guests },
    ] });
  });
  afterEach(() => vi.restoreAllMocks());
  function create(allowed = true) {
    const fixture = TestBed.createComponent(CertificateManualManagementComponent);
    fixture.componentRef.setInput('event', { id: 9, title: 'Evento', execution_status: 'FINISHED', status: 'PUBLISHED', owner_id: 'owner', team_certificate_workload_hours: 8 });
    fixture.componentRef.setInput('allowed', allowed);
    fixture.componentRef.setInput('boxes', [{ text_template: '{participante.nome} {validacao.codigo}', x: .1, y: .1, width: .8, font_size: 25, font_color: '#000000', alignment: 'LEFT' }]);
    fixture.detectChanges(); return fixture;
  }
  it('does not query recipients or issue anything for unauthorized users', () => {
    const fixture = create(false), component = fixture.componentInstance;
    component.recipient = '42'; component.issue(); component.custom(true);
    expect(events.getEditors).not.toHaveBeenCalled(); expect(api.manualInstructor).not.toHaveBeenCalled(); expect(api.manualContent).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('fieldset')).toBeNull();
  });
  it('issues for a confirmed instructor without requiring an account and prevents duplicate operations', () => {
    const component = create().componentInstance;
    const pending = new Subject<Blob>(); api.manualInstructor.mockReturnValueOnce(pending);
    component.recipient = '42'; component.level = 'activity'; component.issue(); component.issue();
    expect(api.manualInstructor).toHaveBeenCalledExactlyOnceWith(9, { instructor_id: 42, activity_id: 5 });
    expect(component.success()).toBe(''); pending.next(new Blob()); pending.complete();
    expect(component.busy()).toBe(false); expect(component.success()).toContain('download');
  });
  it('uses the activity guest link instead of the event guest profile ID', () => {
    const component = create().componentInstance;
    component.kind = 'guest'; component.activity = '5'; component.loadGuests(); component.recipient = '8'; component.level = 'activity';
    component.issue(); expect(api.manualInstructor).toHaveBeenCalledWith(9, { activity_id: 5, activity_guest_id: 8 });
    component.issue(true); expect(api.guestCertificate).toHaveBeenCalledWith(9, 5, 8, true);
    component.level = 'event'; component.issue(); expect(api.manualInstructor).toHaveBeenCalledTimes(1);
  });
  it('limits team recipients to the owner and active editors and requires workload', () => {
    const component = create().componentInstance;
    component.kind = 'team'; component.recipient = 'stranger'; component.issue(); expect(api.manualTeam).not.toHaveBeenCalled();
    component.recipient = 'editor'; component.issue(); expect(api.manualTeam).toHaveBeenCalledWith(9, 'editor');
    component.recipient = 'owner'; component.issue(); expect(api.manualTeam).toHaveBeenCalledWith(9, 'owner');
    component.event = { ...component.event, team_certificate_workload_hours: null }; component.issue(); expect(api.manualTeam).toHaveBeenCalledTimes(2);
  });
  it('previews unsaved custom boxes, removes validation markers and blocks definitive issuance before closure', () => {
    const component = create().componentInstance; component.kind = 'custom';
    component.event = { ...component.event, execution_status: 'IN_PROGRESS' };
    component.custom(true); expect(api.manualContent).not.toHaveBeenCalled();
    component.values = { '{participante.nome}': 'Ana' }; component.custom(true);
    const payload = api.manualContent.mock.calls[0][1];
    expect(payload.variables).toEqual({ '{participante.nome}': 'Ana' });
    expect(payload.boxes[0].text_template).not.toContain('{validacao.codigo}');
    expect(component.boxes[0].text_template).toContain('{validacao.codigo}');
    expect(component.previewUrl()).toBe('blob:result'); component.custom(false); expect(api.manualContent).toHaveBeenCalledTimes(1);
    component.event = { ...component.event, execution_status: 'FINISHED' }; component.custom(false);
    expect(api.manualContent).toHaveBeenLastCalledWith(9, payload, false);
  });
  it('preserves chosen recipient after a failed request and clears loading for retry', () => {
    const component = create().componentInstance; component.recipient = '42';
    api.manualInstructor.mockReturnValueOnce(throwError(() => new Error('offline'))); component.issue();
    expect(component.error()).toBeTruthy(); expect(component.success()).toBe(''); expect(component.busy()).toBe(false); expect(component.recipient).toBe('42');
    component.issue(); expect(component.success()).toContain('gerado');
  });
});
