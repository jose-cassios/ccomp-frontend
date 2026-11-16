import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { EventMaterialsComponent } from './event-materials.component';
import { EventMaterial, EventMaterialsService } from '../../services/event-materials.service';

describe('EventMaterialsComponent', () => {
  const material: EventMaterial = { id: 1, title: 'Slides', type: 'LINK', url: 'https://example.org' };
  const api = { list: vi.fn(), addLink: vi.fn(), upload: vi.fn(), remove: vi.fn(), download: vi.fn() };
  beforeEach(() => {
    vi.resetAllMocks(); api.list.mockReturnValue(of({ content: [], next_cursor: null }));
    TestBed.configureTestingModule({ imports: [EventMaterialsComponent], providers: [{ provide: EventMaterialsService, useValue: api }] });
  });
  function create(manage = true) {
    const fixture = TestBed.createComponent(EventMaterialsComponent);
    fixture.componentRef.setInput('eventId', 9); fixture.componentRef.setInput('manage', manage); fixture.detectChanges(); return fixture;
  }
  it('loads lazily, keeps pagination and hides writes for public visitors', () => {
    const fixture = create(false); const component = fixture.componentInstance;
    expect(api.list).not.toHaveBeenCalled(); expect(fixture.nativeElement.textContent).not.toContain('Adicionar material');
    api.list.mockReturnValueOnce(of({ content: [material], next_cursor: 'next' }));
    const details = fixture.nativeElement.querySelector('details'); details.open = true; details.dispatchEvent(new Event('toggle'));
    fixture.detectChanges(); expect(fixture.nativeElement.querySelector('a').getAttribute('rel')).toContain('noopener');
    component.load(true); expect(api.list).toHaveBeenLastCalledWith(9, undefined, 'next');
    component.save(); component.remove(material); expect(api.addLink).not.toHaveBeenCalled(); expect(api.remove).not.toHaveBeenCalled();
  });
  it('validates links, prevents duplicate submits and preserves inputs on failure', () => {
    const component = create().componentInstance;
    component.form.patchValue({ title: ' Slides ', url: 'javascript:alert(1)' }); component.save(); expect(api.addLink).not.toHaveBeenCalled();
    component.form.controls.url.setValue('https://example.org');
    const pending = new Subject<EventMaterial>(); api.addLink.mockReturnValueOnce(pending);
    component.save(); component.save(); expect(api.addLink).toHaveBeenCalledTimes(1); expect(component.busy()).toBe(true);
    pending.error(new Error('failed')); expect(component.form.controls.title.value).toBe(' Slides '); expect(component.busy()).toBe(false);
    api.addLink.mockReturnValueOnce(of(material)); component.save();
    expect(api.addLink).toHaveBeenLastCalledWith(9, { title: 'Slides', url: 'https://example.org', description: '' }, undefined);
    expect(component.rows()).toEqual([material]); expect(component.form.controls.title.value).toBe('');
  });
  it('validates file size/type and uploads a local PDF with its metadata', () => {
    const component = create().componentInstance; component.kind.set('FILE');
    const select = (file: File) => component.chooseFile({ target: { files: [file], value: 'file' } } as unknown as Event);
    select(new File(['x'], 'bad.svg', { type: 'image/svg+xml' })); expect(component.file()).toBeNull();
    const oversized = new File(['x'], 'large.pdf', { type: 'application/pdf' }); Object.defineProperty(oversized, 'size', { value: 10 * 1024 * 1024 + 1 }); select(oversized); expect(component.file()).toBeNull();
    const file = new File(['PDF'], 'slides.pdf', { type: 'application/pdf' }); select(file);
    expect(component.form.controls.title.value).toBe('slides'); api.upload.mockReturnValue(of({ ...material, type: 'FILE' }));
    component.save(); expect(api.upload).toHaveBeenCalledWith(9, expect.objectContaining({ title: 'slides' }), file, undefined);
    expect(component.file()).toBeNull();
  });
  it('keeps a material when delete fails and removes only after confirmation and success', () => {
    const component = create().componentInstance; component.rows.set([material]);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false); component.remove(material); expect(api.remove).not.toHaveBeenCalled();
    confirm.mockReturnValue(true); api.remove.mockReturnValueOnce(throwError(() => new Error('failed'))); component.remove(material); expect(component.rows()).toEqual([material]);
    api.remove.mockReturnValueOnce(of(null)); component.remove(material); expect(component.rows()).toEqual([]); confirm.mockRestore();
  });
});
