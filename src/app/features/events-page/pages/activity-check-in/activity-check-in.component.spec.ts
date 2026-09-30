import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject } from 'rxjs';
import { AuthService } from '../../../auth/services/auth.service';
import { EventCheckInService } from '../../services/event-check-in.service';
import { ActivityCheckInPageComponent } from './activity-check-in.component';

describe('ActivityCheckInPageComponent', () => {
  const code = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
  function setup(params: Record<string, string> = { activity_id: '7', code }) {
    const result = new Subject<null>();
    const service = { confirm: vi.fn(() => result) };
    TestBed.configureTestingModule({ providers: [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(params) } } },
      { provide: AuthService, useValue: { currentUserState: () => ({ name: 'Ana' }) } },
      { provide: EventCheckInService, useValue: service },
    ] });
    const fixture = TestBed.createComponent(ActivityCheckInPageComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, service, result };
  }

  it('requires explicit confirmation and prevents double submission', () => {
    const { component, service, result, fixture } = setup();
    expect(service.confirm).not.toHaveBeenCalled();
    component.confirm();
    component.confirm();
    expect(service.confirm).toHaveBeenCalledExactlyOnceWith(7, code);
    expect(component.busy()).toBe(true);
    result.next(null);
    result.complete();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Presença confirmada com sucesso');
    component.confirm();
    expect(service.confirm).toHaveBeenCalledTimes(1);
  });

  it('does not send invalid or incomplete QR links to the API', () => {
    const { component, service } = setup({ activity_id: '-1', code: 'invalid' });
    component.confirm();
    expect(component.valid).toBe(false);
    expect(service.confirm).not.toHaveBeenCalled();
  });

  it('explains registration/time/code failures and permits another attempt', () => {
    const { component, result } = setup();
    component.confirm();
    result.error(new HttpErrorResponse({ status: 400 }));
    expect(component.done()).toBe(false);
    expect(component.busy()).toBe(false);
    expect(component.error()).toContain('inscrito nesta atividade');
  });
});
