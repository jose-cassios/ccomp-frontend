import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { EventsService } from '../../services/events.service';
import { ActivityPeopleComponent } from './activity-people.component';

describe('Private activity enrollment list', () => {
  const api = { getActivityEnrollments: vi.fn() };
  beforeEach(() => {
    api.getActivityEnrollments.mockReset();
    TestBed.configureTestingModule({ imports: [ActivityPeopleComponent], providers: [{ provide: EventsService, useValue: api }] });
  });
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
