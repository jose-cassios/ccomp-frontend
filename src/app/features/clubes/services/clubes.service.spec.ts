import { HttpParams } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { ClubesService } from './clubes.service';

describe('ClubesService', () => {
  const api = {
    get: vi.fn(() => of({})),
    post: vi.fn((_endpoint: string, _body: unknown, _options?: { params?: HttpParams }) => of({})),
    patch: vi.fn((_endpoint: string, _body: unknown, _options?: { params?: HttpParams }) => of({})),
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

    expect(api.post.mock.calls[0]?.[0]).toBe('/clubs/search');
    expect(api.post.mock.calls[0]?.[1]).toBeNull();
    expect(api.post.mock.calls[0]?.[2]?.params?.get('nextCursor')).toBe('public-cursor');
    expect(api.post.mock.calls[0]?.[2]?.params?.get('pageSize')).toBe('20');
    expect(api.post.mock.calls[1]?.[0]).toBe('/clubs/me');
    expect(api.post.mock.calls[1]?.[2]?.params?.get('nextCursor')).toBe('mine-cursor');
    expect(api.post.mock.calls[1]?.[2]?.params?.get('pageSize')).toBe('15');
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
    service.searchMembers(4, { role: 'MEMBER', status: 'ACTIVE' }, 'member-cursor', 25).subscribe();
    service.addMember(4, 'pessoa+clube@example.com', 'INSTRUCTOR').subscribe();
    service.changeMemberStatus(8, 'INACTIVE').subscribe();

    expect(api.post).toHaveBeenCalledWith('/clubs/4/members/enroll', null);
    expect(api.post.mock.calls[1]?.[0]).toBe('/clubs/4/members/search');
    expect(api.post.mock.calls[1]?.[1]).toEqual({ role: 'MEMBER', status: 'ACTIVE' });
    expect(api.post.mock.calls[1]?.[2]?.params?.get('cursor')).toBe('member-cursor');
    expect(api.post.mock.calls[1]?.[2]?.params?.get('size')).toBe('25');
    expect(api.post.mock.calls[2]?.[0]).toBe('/clubs/4/members/staff/pessoa%2Bclube%40example.com');
    expect(api.post.mock.calls[2]?.[2]?.params?.get('role')).toBe('INSTRUCTOR');
    expect(api.patch.mock.calls[0]?.[0]).toBe('/clubs/members/8/status');
    expect(api.patch.mock.calls[0]?.[2]?.params?.get('status')).toBe('INACTIVE');
  });
});
