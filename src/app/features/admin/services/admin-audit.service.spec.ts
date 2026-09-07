import { TestBed } from '@angular/core/testing';
import { HttpParams } from '@angular/common/http';
import { of } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { AdminAuditService } from './admin-audit.service';

describe('AdminAuditService', () => {
  const api = {
    post: vi.fn(
      (_endpoint: string, _body: unknown, _options?: { params?: HttpParams }) => of({}),
    ),
  };
  let service: AdminAuditService;

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [AdminAuditService, { provide: ApiService, useValue: api }],
    });
    service = TestBed.inject(AdminAuditService);
  });

  it('searches audit logs through the administrative cursor endpoint', () => {
    service.search({ action: 'USER_BLOCKED', actor_id: 'actor-id' }, 'cursor-2', 25).subscribe();

    expect(api.post).toHaveBeenCalledWith(
      '/admin/audit-logs/users/search',
      { action: 'USER_BLOCKED', actor_id: 'actor-id' },
      { params: expect.objectContaining({}) },
    );
    const params = api.post.mock.calls[0]?.[2]?.params;
    expect(params?.get('nextCursor')).toBe('cursor-2');
    expect(params?.get('pageSize')).toBe('25');
  });
});
