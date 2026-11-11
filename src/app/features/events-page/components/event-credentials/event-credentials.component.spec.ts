import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { EventCredentialsComponent } from './event-credentials.component';
import { CredentialSearchItem, CredentialResult, EventCredentialsService } from '../../services/event-credentials.service';

describe('Event reception', () => {
  const row: CredentialSearchItem = { enrollment: { id: 9, status: 'CONFIRMED', user: { id: 'u', name: 'Ana' } }, eligible: true, credentialed: false };
  const api = { summary: vi.fn(() => of({ eligible: 1, credentialed: 0, remaining: 1 })), search: vi.fn(() => of([row])), credential: vi.fn(() => of({} as CredentialResult)), addOperator: vi.fn(() => of(void 0)), removeOperator: vi.fn(() => of(void 0)) };
  beforeEach(() => { vi.clearAllMocks(); TestBed.configureTestingModule({ imports: [EventCredentialsComponent], providers: [provideRouter([]), { provide: EventCredentialsService, useValue: api }] }); });
  afterEach(() => vi.restoreAllMocks());
  function setup() { const fixture = TestBed.createComponent(EventCredentialsComponent); fixture.componentRef.setInput('eventId', 4); fixture.detectChanges(); return fixture; }
  it('prevents invalid, duplicate and simultaneous credential requests', () => {
    const component = setup().componentInstance;
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.confirm({ ...row, eligible: false });
    component.confirm({ ...row, credentialed: true });
    expect(api.credential).not.toHaveBeenCalled();
    const response = new Subject<CredentialResult>();
    const changed = vi.fn(); component.credentialed.subscribe(changed);
    api.credential.mockReturnValueOnce(response);
    component.rows.set([row]);
    component.confirm(row); component.confirm(row);
    expect(api.credential).toHaveBeenCalledTimes(1);
    expect(component.busy()).toBe(true);
    response.next({} as CredentialResult); response.complete();
    expect(component.rows()[0].credentialed).toBe(true);
    expect(component.rows()[0].enrollment.status).toBe('CHECKED_IN');
    expect(changed).toHaveBeenCalledOnce();
    expect(component.busy()).toBe(false);
    expect(component.message()).toBeTruthy();
  });
  it('retains an eligible enrollment after an API failure so the operator can retry', () => {
    const component = setup().componentInstance;
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    api.credential.mockReturnValueOnce(throwError(() => new Error('offline')));
    component.rows.set([row]); component.confirm(row);
    expect(component.rows()[0].credentialed).toBe(false);
    expect(component.error()).toBeTruthy(); expect(component.busy()).toBe(false);
  });
  it('does not grant operator permissions through the reception-only view', () => {
    const component = setup().componentInstance;
    component.operator.setValue('00000000-0000-0000-0000-000000000001');
    component.changeOperator(true);
    expect(api.addOperator).not.toHaveBeenCalled();
  });
});
