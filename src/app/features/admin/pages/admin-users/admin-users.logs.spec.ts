import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AdminUsersComponent } from './admin-users.component';
import { AuthService } from '../../../auth/services/auth.service';
import { AdminUsersService } from '../../services/admin-users.service';
import { AdminAuditService } from '../../services/admin-audit.service';
import { AdminInfraLogsService } from '../../services/admin-infra-logs.service';

describe('Administração: aba Logs', () => {
  const auth = { hasAnyRole: vi.fn() };
  const logs = { search: vi.fn() };
  beforeEach(() => {
    vi.clearAllMocks();
    logs.search.mockReturnValue(of({ logs: [], start: '2026-10-26T12:00:00Z', end: '2026-10-26T13:00:00Z', limit: 100 }));
    TestBed.configureTestingModule({ imports: [AdminUsersComponent], providers: [
      provideRouter([]), { provide: AuthService, useValue: auth },
      { provide: AdminUsersService, useValue: {} }, { provide: AdminAuditService, useValue: {} },
      { provide: AdminInfraLogsService, useValue: logs },
    ] });
  });

  it('shows Logs after Auditoria for administrators and refreshes the correct section', () => {
    auth.hasAnyRole.mockReturnValue(true);
    const fixture = TestBed.createComponent(AdminUsersComponent);
    vi.spyOn(fixture.componentInstance, 'reload').mockImplementation(() => {});
    fixture.detectChanges();
    const tabs = Array.from(fixture.nativeElement.querySelectorAll('[role="tab"]')) as HTMLButtonElement[];
    expect(tabs.map(tab => tab.textContent?.trim())).toEqual(['Usuários', 'Auditoria', 'Logs']);
    tabs[2].click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-admin-infra-logs')).not.toBeNull();
    expect(logs.search).toHaveBeenCalledTimes(1);
    fixture.componentInstance.refreshActiveSection();
    expect(logs.search).toHaveBeenCalledTimes(2);
  });

  it('hides Logs for moderators and rejects direct selection', () => {
    auth.hasAnyRole.mockReturnValue(false);
    const fixture = TestBed.createComponent(AdminUsersComponent);
    vi.spyOn(fixture.componentInstance, 'reload').mockImplementation(() => {});
    fixture.detectChanges();
    const tabs = Array.from(fixture.nativeElement.querySelectorAll('[role="tab"]')) as HTMLButtonElement[];
    expect(tabs.map(tab => tab.textContent?.trim())).toEqual(['Usuários', 'Auditoria']);
    fixture.componentInstance.selectSection('logs');
    expect(fixture.componentInstance.activeSection()).toBe('users');
    expect(logs.search).not.toHaveBeenCalled();
  });
});
