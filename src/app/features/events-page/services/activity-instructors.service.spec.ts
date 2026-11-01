import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { HttpParams } from '@angular/common/http';
import { ApiService } from '../../../core/api/api.service';
import { ActivityInstructorsService } from './activity-instructors.service';

describe('Activity instructor API contract', () => {
  const api = { get: vi.fn(), post: vi.fn((_path: string, _body?: unknown, _options?: { params: HttpParams }) => of({})), delete: vi.fn(() => of({})) };
  beforeEach(() => { vi.clearAllMocks(); TestBed.configureTestingModule({ providers: [{ provide: ApiService, useValue: api }] }); });
  it('uses the activity invitation and cancellation routes with the correct payload', () => {
    const service = TestBed.inject(ActivityInstructorsService);
    service.invite(7, ' person@ifma.edu.br ').subscribe();
    expect(api.post).toHaveBeenCalledWith('/events/activities/7/instructors/invitations', { email: 'person@ifma.edu.br' });
    service.cancel(8).subscribe(); expect(api.delete).toHaveBeenCalledWith('/events/instructor-invitations/8');
    service.reply('code', false).subscribe();
    expect(api.post.mock.calls.at(-1)?.[0]).toBe('/events/instructor-invitations/code/reply');
    expect((api.post.mock.calls.at(-1) as unknown as [string, null, { params: { get(k: string): string } }])[2].params.get('accept')).toBe('false');
  });
  it('normalizes invitation email and fetches all pages before filtering an activity', () => {
    const service = TestBed.inject(ActivityInstructorsService);
    api.get.mockReturnValueOnce(of([{ id: 1, email_address: 'a@ifma.edu.br', status: 'SENT' }]));
    service.invitations(7).subscribe(rows => expect(rows[0].email).toBe('a@ifma.edu.br'));
    api.get.mockReturnValueOnce(of({ content: [{ id: 1, activityId: 99, status: 'CONFIRMED' }], next_cursor: 'next' }))
      .mockReturnValueOnce(of({ content: [{ id: 2, activity_id: 7, status: 'CONFIRMED' }], next_cursor: null }));
    service.forActivity(5, 7).subscribe(rows => expect(rows.map(r => r.id)).toEqual([2]));
    expect(api.get.mock.calls.at(-1)?.[1].params.get('cursor')).toBe('next');
  });
});
