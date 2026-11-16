import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { ClubCertificatesService } from '../../services/club-certificates.service';
import { ClubCertificateDownloadComponent, ClubCertificatesComponent } from './club-certificates.component';

describe('Club certificate workflow', () => {
  const api = { workload: vi.fn(), saveWorkload: vi.fn(), download: vi.fn() };
  beforeEach(() => {
    vi.resetAllMocks();
    api.workload.mockReturnValue(of({ member_workload_hours: 8, instructor_workload_hours: 12 }));
    api.saveWorkload.mockImplementation((_id, value) => of(value));
    TestBed.configureTestingModule({ imports: [ClubCertificatesComponent, ClubCertificateDownloadComponent], providers: [{ provide: ClubCertificatesService, useValue: api }] });
  });
  it('loads configuration only on demand for managers and prevents negative workloads', () => {
    const fixture = TestBed.createComponent(ClubCertificatesComponent); const component = fixture.componentInstance; component.clubId = 4;
    component.load(); expect(api.workload).not.toHaveBeenCalled();
    component.manage = true; component.load(); expect(component.form.controls.member_workload_hours.value).toBe(8);
    component.form.controls.member_workload_hours.setValue(-1); component.save(); expect(api.saveWorkload).not.toHaveBeenCalled();
    component.form.controls.member_workload_hours.setValue(10.5); component.save();
    expect(api.saveWorkload).toHaveBeenCalledWith(4, { member_workload_hours: 10.5, instructor_workload_hours: 12 });
    expect(component.success()).toContain('atualizada');
  });
  it('does not overwrite server workload with defaults after a failed read', () => {
    api.workload.mockReturnValue(throwError(() => new Error('offline')));
    const component = TestBed.createComponent(ClubCertificatesComponent).componentInstance; component.clubId = 4; component.manage = true;
    component.load(); component.save(); expect(api.saveWorkload).not.toHaveBeenCalled(); expect(component.loaded()).toBe(false);
  });
  it('prevents duplicate downloads and preserves an ineligible certificate error', () => {
    const pending = new Subject<Blob>(); api.download.mockReturnValue(pending);
    const component = TestBed.createComponent(ClubCertificateDownloadComponent).componentInstance; component.clubId = 4;
    component.download(); component.download(); expect(api.download).toHaveBeenCalledTimes(1); expect(component.busy()).toBe(true);
    pending.error(new Error('ineligible')); expect(component.busy()).toBe(false); expect(component.error()).toContain('concluída');
  });
});
