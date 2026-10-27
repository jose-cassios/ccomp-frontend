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
  it('persists inline text edits and handles Delete through the preview', () => {
    const fixture = create(); const component = fixture.componentInstance;
    fixture.nativeElement.querySelector('.canvas-text').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    fixture.detectChanges();
    const editor = fixture.nativeElement.querySelector('.inline-editor') as HTMLTextAreaElement;
    editor.value = 'Certificamos a participação de {participante.nome}';
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    editor.dispatchEvent(new FocusEvent('blur')); fixture.detectChanges();
    expect(component.form.dirty).toBe(true);
    component.save();
    expect(api.saveTemplate.mock.calls[0][2][0].text_template).toBe(editor.value);
    component.addBox(); fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('.canvas-text');
    buttons[1].focus();
    buttons[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true }));
    expect(component.boxes.length).toBe(1);
    expect(component.designBoxes[0].text_template).toBe(editor.value);
    expect(component.form.dirty).toBe(true);
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
  it('updates color and live preview without saving or generating a server preview', () => {
    const fixture = create(); const component = fixture.componentInstance;
    const picker = fixture.nativeElement.querySelector('input[type=color]') as HTMLInputElement;
    picker.value = '#ff0000'; picker.dispatchEvent(new Event('input')); fixture.detectChanges();
    expect(component.designBoxes[0].font_color).toBe('#ff0000'); expect(component.unsaved).toBe(true);
    expect(api.saveTemplate).not.toHaveBeenCalled(); expect(api.preview).not.toHaveBeenCalled();
    component.setOpacity(0, '50');
    expect(component.designBoxes[0].font_color).toBe('#80ff0000');
    component.setColor(0, '#123b6a');
    expect(component.designBoxes[0].font_color).toBe('#80123b6a');
  });
  it('inserts automatic information at the cursor and formats selected text', () => {
    const fixture = create(); const component = fixture.componentInstance;
    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    component.boxes.at(0).controls.text_template.setValue('Olá pessoa!'); fixture.detectChanges();
    textarea.setSelectionRange(4, 10);
    component.insertVariable(0, '{participante.nome}', textarea);
    expect(component.designBoxes[0].text_template).toBe('Olá {participante.nome}!');
    textarea.setSelectionRange(4, 23); component.formatText(0, '**', textarea);
    expect(component.designBoxes[0].text_template).toBe('Olá **{participante.nome}**!');
  });
  it('creates positioned presets, prevents duplicate validation and restores removed text', () => {
    const component = create().componentInstance;
    component.addBox('validation'); component.addBox('validation');
    expect(component.boxes.length).toBe(2); expect(component.hasValidation).toBe(true);
    const validation = component.designBoxes[1];
    expect(validation.text_template).toContain('{evento.title}');
    expect(validation.y).toBe(.85);
    component.removeBox(1); expect(component.hasValidation).toBe(false);
    component.undoRemove(); expect(component.designBoxes[1]).toEqual(validation);
  });
  it('converts percentages and centers text without exceeding the canvas', () => {
    const component = create().componentInstance;
    component.position(0, 'width', '95');
    expect(component.designBoxes[0].width).toBe(.95);
    expect(component.designBoxes[0].x + component.designBoxes[0].width).toBeLessThanOrEqual(1);
    component.centerBox(0); expect(component.designBoxes[0].x).toBeCloseTo(.025);
    component.position(0, 'x', '90'); expect(component.designBoxes[0].x).toBeCloseTo(.05);
    expect(component.form.dirty).toBe(true);
  });
  it('undoes and redoes a whole resize while preserving text and font', () => {
    const component = create().componentInstance;
    const before = { x: .2, y: .5, width: .6 }; const after = { x: .15, y: .5, width: .65 };
    component.beginCanvasEdit(); component.resizeBox({ index: 0, x: after.x, width: after.width });
    component.rememberTransform({ index: 0, before, after });
    component.boxes.at(0).controls.text_template.setValue('Texto atualizado');
    component.undoTransform(); expect(component.designBoxes[0].width).toBe(.6);
    component.redoTransform(); expect(component.designBoxes[0].width).toBe(.65);
    expect(component.designBoxes[0].text_template).toBe('Texto atualizado'); expect(component.designBoxes[0].font_size).toBe(25);
  });
  it('does not reuse geometry history after removal or changes of model', () => {
    const component = create().componentInstance;
    component.rememberTransform({ index: 0, before: { x: .2, y: .5, width: .6 }, after: { x: .3, y: .5, width: .6 } });
    component.selectScope('activity'); expect(component.undoStack()).toEqual([]);
    component.addBox(); component.rememberTransform({ index: 0, before: { x: .2, y: .5, width: .6 }, after: { x: .3, y: .5, width: .6 } });
    component.removeBox(1); expect(component.undoStack()).toEqual([]);
  });
  it('preserves the original pristine state when a canvas gesture is cancelled', () => {
    const component = create().componentInstance;
    component.beginCanvasEdit(); component.moveBox({ index: 0, x: .3, y: .4 });
    component.moveBox({ index: 0, x: .2, y: .5 }); component.cancelCanvasEdit();
    expect(component.form.pristine).toBe(true);
  });
  it('groups text tools and inserts automatic information using the plus menu', () => {
    const fixture = create(); const component = fixture.componentInstance;
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('input[formControlName="font_size"]')?.getAttribute('type')).toBe('number');
    expect(host.querySelector('input[type="range"]')).toBeNull();
    expect(host.querySelector('input[type="checkbox"]')).toBeNull();
    expect(host.textContent).not.toContain('Voltar ao evento');
    expect(host.textContent).not.toContain('Arraste as bordas laterais para ajustar a largura.');
    const menu = host.querySelector('.insert-menu') as HTMLDetailsElement;
    const textarea = host.querySelector('textarea')!;
    textarea.setSelectionRange(0, textarea.value.length); menu.open = true;
    const option = Array.from(menu.querySelectorAll('button')).find(button => button.textContent?.includes('Código de validação'))!;
    option.click();
    expect(component.designBoxes[0].text_template).toBe('{validacao.codigo}');
    expect(menu.open).toBe(false);
  });
  it('explains unavailable underline without changing the certificate content', () => {
    const component = create().componentInstance;
    const text = component.designBoxes[0].text_template;
    component.explainUnderline();
    expect(component.error()).toContain('backend');
    expect(component.designBoxes[0].text_template).toBe(text);
  });
});
