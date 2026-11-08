import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { HttpParams } from '@angular/common/http';
import { ApiService } from '../../../core/api/api.service';
import { ActivityInstructorsService } from './activity-instructors.service';

describe('Activity instructor API contract', () => {
  const api = { get: vi.fn(), patch: vi.fn(() => of({})), post: vi.fn((_path: string, _body?: unknown, _options?: { params: HttpParams }) => of({})), delete: vi.fn(() => of({})) };
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
  it('uses the activity participants endpoint without duplicating guests displayed separately', () => {
    const service = TestBed.inject(ActivityInstructorsService);
    api.get.mockReturnValueOnce(of([{ id: 1, email_address: 'a@ifma.edu.br', status: 'SENT' }]));
    service.invitations(7).subscribe(rows => expect(rows[0].email).toBe('a@ifma.edu.br'));
    api.get.mockReturnValueOnce(of([
      { id: 1, activity_id: 7, is_guest: true, status: 'CONFIRMED' },
      { id: 2, activity_id: 7, user_id: 'user', is_guest: false, role: 'ASSISTANT', status: 'CONFIRMED' },
    ]));
    service.forActivity(5, 7).subscribe(rows => {
      expect(rows.map(r => r.id)).toEqual([2]);
      expect(rows[0].user_id).toBe('user');
      expect(rows[0].role).toBe('ASSISTANT');
    });
    expect(api.get).toHaveBeenLastCalledWith('/events/activities/7/instructors');
  });
  it('creates a direct participant and keeps account linking, removal and self cancellation distinct', () => {
    const service = TestBed.inject(ActivityInstructorsService);
    const profile = { name: 'Auxiliar', description: 'Apoio', role: 'ASSISTANT' as const };
    service.add(7, profile).subscribe();
    expect(api.post).toHaveBeenCalledWith('/events/activities/7/instructors', profile);
    service.linkAccount(7, 2, ' person@ifma.edu.br ').subscribe();
    expect(api.patch).toHaveBeenCalledWith('/events/activities/7/instructors/2/account', { email: 'person@ifma.edu.br' });
    service.remove(7, 2).subscribe();
    expect(api.delete).toHaveBeenLastCalledWith('/events/activities/7/instructors/2');
    service.cancelMine(7).subscribe();
    expect(api.delete).toHaveBeenLastCalledWith('/events/activities/7/instructors/me');
  });

  it('loads every cursor page and normalizes instructor record and account IDs separately', () => {
    api.get.mockReturnValueOnce(of({ content: [{ id: 11, activityId: 2, userId: 'account', status: 'CONFIRMED' }], nextCursor: 'next' }))
      .mockReturnValueOnce(of({ content: [{ id: 12, activity_id: 3, user_id: 'account', status: 'CONFIRMED' }], next_cursor: null }));
    const service = TestBed.inject(ActivityInstructorsService);
    service.forEvent(7).subscribe(rows => { expect(rows.map(r => r.id)).toEqual([11, 12]); expect(rows[0].user_id).toBe('account'); expect(rows[0].activity_id).toBe(2); });
    expect(api.get.mock.calls[0][0]).toBe('/events/7/instructors');
    expect(api.get.mock.calls[1][1].params.get('cursor')).toBe('next');
  });
  it('stops a repeated cursor instead of fetching indefinitely', () => {
    api.get.mockReturnValue(of({ content: [], next_cursor: 'same' }));
    const error = vi.fn(); TestBed.inject(ActivityInstructorsService).forEvent(7).subscribe({ error });
    expect(error).toHaveBeenCalled(); expect(api.get).toHaveBeenCalledTimes(2);
  });

});
