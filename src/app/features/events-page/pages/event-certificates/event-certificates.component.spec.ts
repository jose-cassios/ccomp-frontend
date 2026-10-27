import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { EventCertificatesComponent } from './event-certificates.component';
import { EventsService } from '../../services/events.service';
import { CertificatesService } from '../../services/certificates.service';
import { AuthService } from '../../../auth/services/auth.service';
import { CertificateBox } from '../../models/certificate.model';

describe('Event certificate customization', () => {
  const box: CertificateBox = { text_template: '{participante.nome}', x: .2, y: .5, width: .6, font_size: 25, font_color: null, alignment: null };
  const api = { template: vi.fn(), variables: vi.fn(), cover: vi.fn(), saveTemplate: vi.fn(), preview: vi.fn(), uploadCover: vi.fn(), deleteCover: vi.fn() };
  const events = { getById: vi.fn(), getEditableEvents: vi.fn() };
  const auth = { hasAnyRole: vi.fn(), currentUserState: vi.fn() };
  beforeEach(() => {
    vi.resetAllMocks();
    Object.defineProperty(URL, 'createObjectURL', { value: vi.fn(() => 'blob:certificate'), configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), configurable: true });
    api.template.mockReturnValue(of({ boxes: [box], variables: [] }));
    api.variables.mockReturnValue(of(['{participante.nome}', '{validacao.codigo}']));
    api.cover.mockReturnValue(of(new Blob())); api.preview.mockReturnValue(of(new Blob()));
    api.saveTemplate.mockReturnValue(of({})); api.deleteCover.mockReturnValue(of(null));
    events.getById.mockReturnValue(of({ id: 9, title: 'Evento', owner_id: 'owner' }));
    events.getEditableEvents.mockReturnValue(of({ content: [], next_cursor: null }));
    auth.currentUserState.mockReturnValue({ id: 'owner' }); auth.hasAnyRole.mockReturnValue(false);
    TestBed.configureTestingModule({ imports: [EventCertificatesComponent], providers: [provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '9' }) } } },
      { provide: CertificatesService, useValue: api }, { provide: EventsService, useValue: events },
      { provide: AuthService, useValue: auth },
    ] });
  });
  function create() {
    const fixture = TestBed.createComponent(EventCertificatesComponent); fixture.detectChanges(); return fixture;
  }
  it('loads both models for the owner and preserves separate unsaved drafts', () => {
    const fixture = create(); const component = fixture.componentInstance;
    expect(component.allowed()).toBe(true);
    component.boxes.at(0).controls.text_template.setValue('Texto do evento');
    component.form.markAsDirty(); component.selectScope('activity');
    expect(component.boxes.at(0).controls.text_template.value).toBe('{participante.nome}');
    component.selectScope('event');
    expect(component.boxes.at(0).controls.text_template.value).toBe('Texto do evento');
    expect(component.unsaved).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Fundo do certificado');
  });
  it('finds an active editor beyond the first page', () => {
    auth.currentUserState.mockReturnValue({ id: 'editor' });
    events.getEditableEvents.mockReturnValueOnce(of({ content: [], next_cursor: 'next' }))
      .mockReturnValueOnce(of({ content: [{ id: 9 }], next_cursor: null }));
    const component = create().componentInstance;
    expect(component.allowed()).toBe(true);
    expect(events.getEditableEvents).toHaveBeenLastCalledWith('next');
  });
  it('does not load or mutate templates for unrelated users', () => {
    auth.currentUserState.mockReturnValue({ id: 'stranger' });
    const component = create().componentInstance;
    expect(component.allowed()).toBe(false); expect(api.template).not.toHaveBeenCalled();
    component.save(); expect(api.saveTemplate).not.toHaveBeenCalled();
  });
  it('saves before requesting preview and blocks duplicate operations', () => {
    const pending = new Subject<unknown>(); api.saveTemplate.mockReturnValue(pending);
    const component = create().componentInstance; component.form.markAsDirty();
    component.save(); component.save();
    expect(api.saveTemplate).toHaveBeenCalledTimes(1); expect(api.preview).not.toHaveBeenCalled();
    expect(component.busy()).toBe(true);
    pending.next({}); pending.complete();
    expect(api.preview).toHaveBeenCalledWith(9, 'event'); expect(component.unsaved).toBe(false);
    expect(component.busy()).toBe(false); expect(component.previewUrl()).toBe('blob:certificate');
  });
  it('validates text and geometry before save, retaining drafts after failure', () => {
    const component = create().componentInstance;
    component.boxes.at(0).controls.width.setValue(0); component.save();
    expect(api.saveTemplate).not.toHaveBeenCalled(); expect(component.error()).toContain('Revise');
    component.boxes.at(0).controls.width.setValue(.5); component.form.markAsDirty();
    api.saveTemplate.mockReturnValue(throwError(() => new Error('offline'))); component.save();
    expect(component.unsaved).toBe(true); expect(component.busy()).toBe(false);
  });
  it('rejects unsupported backgrounds without uploading', () => {
    const component = create().componentInstance;
    component.upload({ target: { files: [new File(['<svg/>'], 'cover.svg', { type: 'image/svg+xml' })], value: 'cover.svg' } } as unknown as Event);
    expect(api.uploadCover).not.toHaveBeenCalled(); expect(component.error()).toContain('PNG');
  });
  it('warns about pending changes but lets users leave a slow operation', () => {
    const component = create().componentInstance;
    component.form.markAsDirty();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    expect(component.canDeactivate()).toBe(false);
    component.busy.set(true); confirm.mockReturnValue(true);
    expect(component.canDeactivate()).toBe(true);
    expect(confirm).toHaveBeenLastCalledWith(expect.stringContaining('operação em andamento'));
  });
  it('restores the shared background and discards stale preview', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const component = create().componentInstance; component.preview(); component.restoreCover();
    expect(api.deleteCover).toHaveBeenCalledWith(9); expect(component.previewUrl()).toBeNull();
    expect(component.success()).toContain('restaurado');
  });
});
