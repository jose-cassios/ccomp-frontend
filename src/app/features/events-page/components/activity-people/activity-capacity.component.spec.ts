import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { EventsService } from '../../services/events.service';
import { ActivityCapacityComponent, ActivityCapacity } from './activity-capacity.component';

describe('Public activity capacity', () => {
  const api = { getActivityCapacity: vi.fn() };
  beforeEach(() => {
    api.getActivityCapacity.mockReset().mockReturnValue(of({ current_enrollments: 4, max_capacity: 10 }));
    TestBed.configureTestingModule({ imports: [ActivityCapacityComponent], providers: [{ provide: EventsService, useValue: api }] });
  });
  function setup() {
    const fixture = TestBed.createComponent(ActivityCapacityComponent);
    fixture.componentRef.setInput('activityId', 3); fixture.detectChanges(); return fixture;
  }
  it('shows filled and total places and refreshes after enrollment changes', () => {
    const fixture = setup();
    expect(fixture.nativeElement.textContent).toContain('4 / 10');
    api.getActivityCapacity.mockReturnValue(of({ current_enrollments: 10, max_capacity: 10 }));
    fixture.componentRef.setInput('revision', 1); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.full').textContent).toContain('10 / 10');
  });
  it('does not present a failed lookup as zero places and cancels obsolete requests', () => {
    const pending = new Subject<ActivityCapacity>(); api.getActivityCapacity.mockReturnValueOnce(pending);
    const fixture = setup(); expect(fixture.componentInstance.loading()).toBe(true);
    api.getActivityCapacity.mockReturnValueOnce(throwError(() => new Error('offline')));
    fixture.componentRef.setInput('activityId', 4); fixture.detectChanges();
    pending.next({ current_enrollments: 99, max_capacity: 99 });
    expect(fixture.componentInstance.capacity()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Consultar vagas');
    expect(fixture.nativeElement.textContent).not.toContain('99');
  });
});
