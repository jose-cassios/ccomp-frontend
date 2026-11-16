import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiConfig } from '../../../core/api/api.config';
import { ClubCertificatesService } from './club-certificates.service';
import { ClubMaterialsService } from './club-materials.service';

describe('Club materials and certificate contracts', () => {
  let http: HttpTestingController;
  let materials: ClubMaterialsService;
  let certificates: ClubCertificatesService;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(),
      { provide: ApiConfig, useValue: { buildUrl: (path: string) => '/api' + path } },
    ] });
    http = TestBed.inject(HttpTestingController); materials = TestBed.inject(ClubMaterialsService); certificates = TestBed.inject(ClubCertificatesService);
  });
  afterEach(() => http.verify());
  it('lists and paginates materials at the club endpoint, normalizing metadata', () => {
    materials.list(4, undefined, 'next').subscribe(page => {
      expect(page.content[0].original_file_name).toBe('a.pdf'); expect(page.content[0].size_bytes).toBe(10); expect(page.next_cursor).toBe('other');
    });
    const req = http.expectOne('/api/clubs/4/materials?pageSize=10&nextCursor=next');
    req.flush({ content: [{ id: 2, title: 'A', type: 'FILE', originalFileName: 'a.pdf', sizeBytes: 10 }], nextCursor: 'other' });
  });
  it('creates links and uploads local files with the expected multipart names', () => {
    const link = { title: 'Slides', description: 'Aula', url: 'https://example.com/slides' };
    materials.addLink(4, link).subscribe(); const request = http.expectOne('/api/clubs/4/materials/links');
    expect(request.request.method).toBe('POST'); expect(request.request.body).toEqual(link); request.flush({ id: 1, ...link });
    const file = new File(['file'], 'a.pdf', { type: 'application/pdf' });
    materials.upload(4, { title: 'A', description: 'B' }, file).subscribe();
    const upload = http.expectOne('/api/clubs/4/materials/files');
    expect(upload.request.body.get('file')).toBe(file); expect(upload.request.body.get('title')).toBe('A'); expect(upload.request.body.get('description')).toBe('B'); upload.flush({ id: 2 });
  });
  it('downloads protected materials as blobs and deletes by material ID', () => {
    materials.download(4, 2).subscribe(); const download = http.expectOne('/api/clubs/4/materials/2/file');
    expect(download.request.responseType).toBe('blob'); download.flush(new Blob(['pdf']));
    materials.remove(4, 2).subscribe(); const remove = http.expectOne('/api/clubs/4/materials/2'); expect(remove.request.method).toBe('DELETE'); remove.flush(null);
  });
  it('loads and saves independent member and instructor workloads with PUT', () => {
    certificates.workload(4).subscribe(value => expect(value.member_workload_hours).toBe(6));
    http.expectOne('/api/clubs/4/certificates/workload').flush({ clubId: 4, memberWorkloadHours: 6, instructorWorkloadHours: 12 });
    certificates.saveWorkload(4, { member_workload_hours: 8, instructor_workload_hours: 12.5 }).subscribe();
    const save = http.expectOne('/api/clubs/4/certificates/workload'); expect(save.request.method).toBe('PUT');
    expect(save.request.body).toEqual({ member_workload_hours: 8, instructor_workload_hours: 12.5 }); save.flush({ club_id: 4, ...save.request.body });
  });
  it('issues self, member and instructor certificates using recipient user IDs', () => {
    certificates.download(4).subscribe(); certificates.download(4, { id: 'user-uuid', role: 'MEMBER' }).subscribe(); certificates.download(4, { id: 'instructor-uuid', role: 'INSTRUCTOR' }).subscribe();
    for (const path of ['me', 'members/user-uuid', 'instructors/instructor-uuid']) {
      const req = http.expectOne('/api/clubs/4/certificates/' + path); expect(req.request.responseType).toBe('blob'); req.flush(new Blob(['png'], { type: 'image/png' }));
    }
  });
  it('normalizes public validation and retains zero workload', () => {
    certificates.validate(' abc123 ').subscribe(value => {
      expect(value.recipient_name).toBe('Ana'); expect(value.club_name).toBe('Robótica'); expect(value.workload_hours).toBe(0);
    });
    http.expectOne('/api/clubs/certificates/validation/ABC123').flush({ code: 'ABC123', recipientName: 'Ana', clubName: 'Robótica', certificateType: 'MEMBER', workloadHours: 0 });
  });
});
