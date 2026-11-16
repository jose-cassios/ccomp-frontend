import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EventMaterialsService, safeMaterialUrl } from './event-materials.service';

describe('EventMaterialsService contracts', () => {
  let service: EventMaterialsService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(EventMaterialsService); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  for (const activityId of [undefined, 7]) {
    it(`lists, adds, downloads and removes materials for ${activityId ? 'activity' : 'event'}`, () => {
      const base = activityId ? '/events/activities/7/materials' : '/events/9/materials';
      service.list(9, activityId, 'cursor').subscribe(page => {
        expect(page.content[0].original_file_name).toBe('slides.pdf'); expect(page.next_cursor).toBe('next');
      });
      const list = http.expectOne(r => r.url.endsWith(base));
      expect(list.request.params.get('nextCursor')).toBe('cursor'); expect(list.request.params.get('pageSize')).toBe('10');
      list.flush({ content: [{ id: 1, type: 'FILE', title: 'Slides', originalFileName: 'slides.pdf' }], next_cursor: 'next' });
      const link = { title: 'Referência', description: '', url: 'https://example.org/a' };
      service.addLink(9, link, activityId).subscribe();
      const post = http.expectOne(r => r.url.endsWith(base + '/links'));
      expect(post.request.method).toBe('POST'); expect(post.request.body).toEqual(link); post.flush({ id: 2, ...link });
      const file = new File(['PDF'], 'slides.pdf', { type: 'application/pdf' });
      service.upload(9, { title: 'Slides', description: 'Aula' }, file, activityId).subscribe();
      const upload = http.expectOne(r => r.url.endsWith(base + '/files'));
      expect(upload.request.body.get('file')).toBe(file); expect(upload.request.body.get('title')).toBe('Slides'); upload.flush({ id: 3 });
      service.download(9, 3, activityId).subscribe();
      const download = http.expectOne(r => r.url.endsWith(base + '/3/file'));
      expect(download.request.responseType).toBe('blob'); download.flush(new Blob(['PDF']));
      service.remove(9, 3, activityId).subscribe();
      const remove = http.expectOne(r => r.url.endsWith(base + '/3'));
      expect(remove.request.method).toBe('DELETE'); remove.flush(null);
    });
  }
  it('only accepts complete HTTP(S) links', () => {
    for (const value of ['javascript:alert(1)', 'data:text/html,test', '/private', 'invalid']) expect(safeMaterialUrl(value)).toBeNull();
    expect(safeMaterialUrl('https://example.org/a')).toBe('https://example.org/a');
  });
});
