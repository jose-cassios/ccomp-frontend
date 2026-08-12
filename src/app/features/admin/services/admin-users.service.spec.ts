import { TestBed } from '@angular/core/testing';
import { HttpParams } from '@angular/common/http';
import { of } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { AdminUsersService } from './admin-users.service';

describe('AdminUsersService', () => {
  const api = {
    get: vi.fn((_endpoint: string) => of({})),
    post: vi.fn(
      (_endpoint: string, _body: unknown, _options?: { params?: HttpParams }) => of({}),
    ),
    delete: vi.fn((_endpoint: string) => of({})),
  };
  let service: AdminUsersService;

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [AdminUsersService, { provide: ApiService, useValue: api }],
    });
    service = TestBed.inject(AdminUsersService);
  });

  it('should search users through the paginated administrative endpoint', () => {
    service.search({ status_account: 'BLOCKED' }, 'cursor-2', 25).subscribe();

    expect(api.post).toHaveBeenCalledWith(
      '/admin/users/search',
      { status_account: 'BLOCKED' },
      { params: expect.objectContaining({}) },
    );
    const params = api.post.mock.calls[0]?.[2]?.params;
    expect(params?.get('nextCursor')).toBe('cursor-2');
    expect(params?.get('pageSize')).toBe('25');
  });

  it('should use the administrative prefix for role and account operations', () => {
    service.assignRole('user-id', 'STAFF').subscribe();
    service.removeRole('user-id', 'STAFF').subscribe();
    service.block('user-id', 'Motivo do bloqueio').subscribe();
    service.unlock('user-id', 'Motivo do desbloqueio').subscribe();

    expect(api.post).toHaveBeenCalledWith('/admin/users/user-id/roles/STAFF', null);
    expect(api.delete).toHaveBeenCalledWith('/admin/users/user-id/roles/STAFF');
    expect(api.post).toHaveBeenCalledWith('/admin/users/user-id/block', {
      reason: 'Motivo do bloqueio',
    });
    expect(api.post).toHaveBeenCalledWith('/admin/users/user-id/unlock', {
      reason: 'Motivo do desbloqueio',
    });
  });
});
