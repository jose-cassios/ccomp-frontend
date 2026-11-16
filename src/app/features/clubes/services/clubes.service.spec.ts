import { HttpParams } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { ClubesService } from './clubes.service';

describe('ClubesService', () => {
  const api = {
    get: vi.fn((endpoint: string, _options?: { params?: HttpParams }) => of<unknown>(endpoint === '/highlights/clubs' ? [] : { content: [] })),
    post: vi.fn((_endpoint: string, _body: unknown, _options?: { params?: HttpParams }) => of<unknown>({})),
    patch: vi.fn((_endpoint: string, _body: unknown, _options?: { params?: HttpParams }) => of<unknown>({})),
    delete: vi.fn(() => of(void 0)),
  };
  let service: ClubesService;

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [ClubesService, { provide: ApiService, useValue: api }],
    });
    service = TestBed.inject(ClubesService);
  });

  it('should use cursor pagination for public and managed clubs', () => {
    service.search('public-cursor', 20).subscribe();
    service.getMine('mine-cursor', 15).subscribe();

    expect(api.get.mock.calls[0]?.[0]).toBe('/clubs/search');
    expect(api.get.mock.calls[0]?.[1]?.params?.get('nextCursor')).toBe('public-cursor');
    expect(api.get.mock.calls[0]?.[1]?.params?.get('pageSize')).toBe('20');
    expect(api.get.mock.calls[1]?.[0]).toBe('/clubs/me');
    expect(api.get.mock.calls[1]?.[1]?.params?.get('nextCursor')).toBe('mine-cursor');
    expect(api.get.mock.calls[1]?.[1]?.params?.get('pageSize')).toBe('15');
    expect(api.post).not.toHaveBeenCalled();
  });

  it('should map club CRUD and highlights to the documented routes', () => {
    const createPayload = { name: 'Clube de Testes', summary: 'Resumo válido do clube.' };
    const updatePayload = { content: 'Conteúdo atualizado.' };

    service.getHighlights().subscribe();
    service.getById(4).subscribe();
    service.create(createPayload).subscribe();
    service.update(4, updatePayload).subscribe();
    service.delete(4).subscribe();

    expect(api.get).toHaveBeenCalledWith('/highlights/clubs');
    expect(api.get).toHaveBeenCalledWith('/clubs/4');
    expect(api.post).toHaveBeenCalledWith('/clubs', createPayload);
    expect(api.patch).toHaveBeenCalledWith('/clubs/4', updatePayload);
    expect(api.delete).toHaveBeenCalledWith('/clubs/4');
  });

  it('should map enrollment and member management routes', () => {
    service.enroll(4).subscribe();
    service.unenroll(4).subscribe();
    service.searchMembers(4, { role: 'MEMBER', status: 'ACTIVE' }, 'member-cursor', 25).subscribe();
    service.addMember(4, 'pessoa+clube@example.com', 'INSTRUCTOR').subscribe();
    service.changeMemberStatus(4, 8, 'INACTIVE').subscribe();

    expect(api.post).toHaveBeenCalledWith('/clubs/4/members/enroll', null);
    expect(api.delete).toHaveBeenCalledWith('/clubs/4/members/unenroll');
    expect(api.post.mock.calls[1]?.[0]).toBe('/clubs/4/members/search');
    expect(api.post.mock.calls[1]?.[1]).toEqual({ role: 'MEMBER', status: 'ACTIVE' });
    expect(api.post.mock.calls[1]?.[2]?.params?.get('cursor')).toBe('member-cursor');
    expect(api.post.mock.calls[1]?.[2]?.params?.get('size')).toBe('25');
    expect(api.post.mock.calls[2]?.[0]).toBe('/clubs/4/members/staff/pessoa%2Bclube%40example.com');
    expect(api.post.mock.calls[2]?.[2]?.params?.get('role')).toBe('INSTRUCTOR');
    expect(api.patch.mock.calls[0]?.[0]).toBe('/clubs/4/members/8/status');
    expect(api.patch.mock.calls[0]?.[2]?.params?.get('status')).toBe('INACTIVE');
  });
  it('normalizes camelCase club fields and pagination cursors', () => {
    api.get.mockReturnValueOnce(of({ content: [{ id: 4, name: 'Robótica', coverImageUrl: 'https://example.org/image.png', publishedAt: '2026-11-15T09:00:00' }], nextCursor: 'next', previousCursor: null }));
    service.search().subscribe(page => {
      expect(page.next_cursor).toBe('next'); expect(page.content[0].cover_image_url).toBe('https://example.org/image.png'); expect(page.content[0].published_at).toBe('2026-11-15T09:00:00');
    });
  });
  it('maps member summaries and entity enrollment responses', () => {
    api.post.mockReturnValueOnce(of({ content: [{ id: 8, clubId: 4, role: 'INSTRUCTOR', status: 'ACTIVE', user: { id: 'u', name: 'Ana', emailAddress: 'ana@example.com' } }], nextCursor: 'cursor' }));
    service.searchMembers(4).subscribe(page => { expect(page.content[0].user.email_address).toBe('ana@example.com'); expect(page.content[0].club_id).toBe(4); expect(page.next_cursor).toBe('cursor'); });
    api.post.mockReturnValueOnce(of({ id: 8, club: { id: 4 }, userId: 'u', role: 'MEMBER', status: 'ACTIVE', joinedAt: '2026-11-15T10:00:00' }));
    service.enroll(4).subscribe(row => { expect(row.club_id).toBe(4); expect(row.user_id).toBe('u'); expect(row.joined_at).toBe('2026-11-15T10:00:00'); });
  });
  it('encodes normalized email addresses and keeps pagination within API limits', () => {
    service.addMember(4, ' Ana+Clube@Example.com ', 'INSTRUCTOR').subscribe();
    expect(api.post).toHaveBeenCalledWith('/clubs/4/members/staff/ana%2Bclube%40example.com', null, expect.anything());
    service.search(undefined, 100).subscribe(); expect(api.get.mock.calls[0][1]?.params?.get('pageSize')).toBe('50');
  });

});
