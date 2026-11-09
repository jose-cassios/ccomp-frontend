import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivityInstructorsComponent } from './activity-instructors.component';
import { ActivityInstructorsService, Instructor } from '../../services/activity-instructors.service';
import { EventsService } from '../../services/events.service';
import { AuthService } from '../../../auth/services/auth.service';

describe('Activity instructor permissions', () => {
  const person: Instructor = { id: 2, activity_id: 7, user_id: 'me', status: 'CONFIRMED', name: 'Ana', is_guest: false };
  const api = { forActivity: vi.fn(() => of([person])), cancelMine: vi.fn(() => of({})), remove: vi.fn(() => of(void 0)), linkAccount: vi.fn(() => of({})) };
  const events = { getAllActivities: vi.fn(() => of([{ id: 7, title: 'Oficina', description: 'Conteúdo', location: '' }])), updateActivity: vi.fn(() => of({})) };
  beforeEach(() => { vi.clearAllMocks(); TestBed.configureTestingModule({ imports: [ActivityInstructorsComponent], providers: [
    { provide: ActivityInstructorsService, useValue: api }, { provide: EventsService, useValue: events },
    { provide: AuthService, useValue: { currentUserState: () => ({ id: 'me' }) } },
  ] }); });
  function setup() { const fixture = TestBed.createComponent(ActivityInstructorsComponent); fixture.componentRef.setInput('eventId', 4); fixture.componentRef.setInput('activityId', 7); fixture.detectChanges(); return fixture; }
  it('lets a confirmed instructor edit their own activity using the normal activity PATCH', () => {
    const fixture = setup(), component = fixture.componentInstance;
    const changed = vi.fn(); component.activityChanged.subscribe(changed);
    expect(fixture.nativeElement.textContent).toContain('Editar minha atividade');
    expect(fixture.nativeElement.textContent).not.toContain('Excluir desta atividade');
    component.editMine();
    expect(component.editing()).toBe(true);
    component.activityForm.controls.title.setValue('Oficina atualizada');
    component.saveMine();
    expect(events.updateActivity).toHaveBeenCalledWith(7, { title: 'Oficina atualizada', description: 'Conteúdo', location: '' });
    expect(changed).toHaveBeenCalledOnce();
  });
  it('does not grant editing to an accountless participant or another user', () => {
    const component = setup().componentInstance;
    for (const user_id of [null, 'someone-else']) {
      component.people.set([{ ...person, user_id }]);
      component.editMine(); component.saveMine();
    }
    expect(events.getAllActivities).not.toHaveBeenCalled();
    expect(events.updateActivity).not.toHaveBeenCalled();
  });
  it('hides the section when the backend denies visibility', () => {
    api.forActivity.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 403 })));
    const fixture = setup();
    expect(fixture.nativeElement.querySelector('section')).toBeNull();
  });
});
