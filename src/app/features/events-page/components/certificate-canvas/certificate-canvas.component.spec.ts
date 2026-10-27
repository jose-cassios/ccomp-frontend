import { TestBed } from '@angular/core/testing';
import { CertificateCanvasComponent } from './certificate-canvas.component';
import { CertificateBox } from '../../models/certificate.model';

describe('Certificate interactive preview', () => {
  const box: CertificateBox = { text_template: '**{participante.nome}**', x: .1, y: .2, width: .6,
    font_color: '#80123b6a', font_size: 40, alignment: 'CENTERED' };
  function create() {
    const fixture = TestBed.createComponent(CertificateCanvasComponent);
    fixture.componentRef.setInput('cover', 'test.png'); fixture.componentRef.setInput('boxes', [box]);
    fixture.componentRef.setInput('samples', { '{participante.nome}': 'Ana <img src=x>' });
    fixture.detectChanges(); return fixture;
  }
  it('renders sample text safely and refreshes styles immediately', () => {
    const fixture = create();
    expect(fixture.nativeElement.querySelector('.bold').textContent).toBe('Ana <img src=x>');
    expect(fixture.nativeElement.querySelectorAll('img').length).toBe(1);
    expect(fixture.componentInstance.rendered()[0].color).toBe('#123b6a80');
    fixture.componentRef.setInput('boxes', [{ ...box, font_color: '#ff0000' }]); fixture.detectChanges();
    expect(fixture.componentInstance.rendered()[0].color).toBe('#ff0000ff');
  });
  it('scales font size using the actual background dimensions', () => {
    const component = create().componentInstance;
    const dimensions = vi.fn(); component.dimensions.subscribe(dimensions);
    component.loaded({ target: { naturalWidth: 2000, naturalHeight: 1400 } } as unknown as Event);
    expect(component.imageWidth()).toBe(2000);
    expect(dimensions).toHaveBeenCalledWith({ width: 2000, height: 1400 });
  });
  it('keeps dragged text inside the visible image and stops on pointer release', () => {
    const fixture = create(); const component = fixture.componentInstance;
    const button = fixture.nativeElement.querySelector('.canvas-text');
    button.setPointerCapture = vi.fn();
    vi.spyOn(button.parentElement.parentElement, 'getBoundingClientRect').mockReturnValue({ width: 1000, height: 500 } as DOMRect);
    vi.spyOn(button.parentElement, 'getBoundingClientRect').mockReturnValue({ height: 100 } as DOMRect);
    const moved = vi.fn(); component.moved.subscribe(moved);
    component.start({ button: 0, pointerId: 1, clientX: 100, clientY: 100, currentTarget: button, preventDefault: vi.fn() } as unknown as PointerEvent, 0);
    component.move({ pointerId: 1, clientX: 2000, clientY: 2000 } as PointerEvent);
    expect(moved).toHaveBeenLastCalledWith({ index: 0, x: .4, y: .8 });
    component.stop(); component.move({ pointerId: 1, clientX: 0, clientY: 0 } as PointerEvent);
    expect(moved).toHaveBeenCalledTimes(1);
  });
  it('supports arrow keys and blocks movement during save', () => {
    const fixture = create(); const component = fixture.componentInstance;
    const button = fixture.nativeElement.querySelector('.canvas-text'); const moved = vi.fn();
    component.moved.subscribe(moved);
    const event = { key: 'ArrowRight', shiftKey: true, preventDefault: vi.fn(), currentTarget: button } as unknown as KeyboardEvent;
    component.key(event, 0);
    expect(moved).toHaveBeenCalledWith({ index: 0, x: .11, y: .2 });
    fixture.componentRef.setInput('disabled', true); component.key(event, 0);
    expect(moved).toHaveBeenCalledTimes(1);
  });
  it('edits the template on double click and restores it on Escape', () => {
    const fixture = create(); const component = fixture.componentInstance;
    const changed = vi.fn(); const removed = vi.fn();
    component.textChanged.subscribe(changed); component.deleteRequested.subscribe(removed);
    fixture.nativeElement.querySelector('.canvas-text').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    fixture.detectChanges();
    const editor = fixture.nativeElement.querySelector('.inline-editor') as HTMLTextAreaElement;
    expect(editor.value).toBe(box.text_template);
    editor.value = 'Novo texto'; editor.dispatchEvent(new Event('input', { bubbles: true }));
    expect(changed).toHaveBeenLastCalledWith({ index: 0, text: 'Novo texto' });
    editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
    expect(removed).not.toHaveBeenCalled();
    editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(changed).toHaveBeenLastCalledWith({ index: 0, text: box.text_template });
    expect(fixture.nativeElement.querySelector('.inline-editor')).toBeNull();
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('.canvas-text'));
  });
  it('keeps edited content when focus leaves the text box', () => {
    const fixture = create(); const component = fixture.componentInstance;
    const changed = vi.fn(); component.textChanged.subscribe(changed);
    component.editText(0); fixture.detectChanges();
    const editor = fixture.nativeElement.querySelector('.inline-editor') as HTMLTextAreaElement;
    editor.value = 'Conteúdo atualizado'; editor.dispatchEvent(new Event('input'));
    editor.dispatchEvent(new FocusEvent('blur'));
    expect(component.editing()).toBeNull();
    expect(changed).toHaveBeenCalledTimes(1);
    expect(changed).toHaveBeenCalledWith({ index: 0, text: 'Conteúdo atualizado' });
  });
  it('deletes the focused box without repeating or deleting the last required box', () => {
    const fixture = create(); const component = fixture.componentInstance; const removed = vi.fn();
    component.deleteRequested.subscribe(removed);
    const press = (repeat = false) => fixture.nativeElement.querySelector('.canvas-text')
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', repeat, bubbles: true, cancelable: true }));
    press(); expect(removed).not.toHaveBeenCalled();
    fixture.componentRef.setInput('boxes', [box, { ...box, text_template: 'Outro texto' }]); fixture.detectChanges();
    press(); press(true); expect(removed).toHaveBeenCalledExactlyOnceWith(0);
    fixture.componentRef.setInput('disabled', true); fixture.detectChanges(); press();
    expect(removed).toHaveBeenCalledTimes(1);
  });
  it('zooms only over the certificate and leaves outside scrolling alone', () => {
    const fixture = create(); const component = fixture.componentInstance;
    const canvas = fixture.nativeElement.querySelector('.canvas');
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 1000, height: 500 } as DOMRect);
    const outside = new WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true });
    fixture.nativeElement.querySelector('.viewport').dispatchEvent(outside);
    expect(outside.defaultPrevented).toBe(false); expect(component.zoom()).toBe(100);
    const inside = new WheelEvent('wheel', { deltaY: -100, clientX: 500, clientY: 250, bubbles: true, cancelable: true });
    canvas.dispatchEvent(inside);
    expect(inside.defaultPrevented).toBe(true); expect(component.zoom()).toBeGreaterThan(100);
    for (let i = 0; i < 30; i++) canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, cancelable: true }));
    expect(component.zoom()).toBe(250);
    for (let i = 0; i < 30; i++) canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, cancelable: true }));
    expect(component.zoom()).toBe(50);
    expect(fixture.nativeElement.querySelector('select')).toBeNull();
    component.editText(0); fixture.detectChanges();
    const typing = new WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true });
    fixture.nativeElement.querySelector('.inline-editor').dispatchEvent(typing);
    expect(typing.defaultPrevented).toBe(false); expect(component.zoom()).toBe(50);
  });
  function startGesture(fixture: ReturnType<typeof create>, side?: 'left' | 'right') {
    const target = fixture.nativeElement.querySelector(side ? '.resize-handle.' + side : '.canvas-text');
    target.setPointerCapture = vi.fn();
    vi.spyOn(target.parentElement.parentElement, 'getBoundingClientRect').mockReturnValue({ width: 1000, height: 500 } as DOMRect);
    vi.spyOn(target.parentElement, 'getBoundingClientRect').mockReturnValue({ height: 100 } as DOMRect);
    fixture.componentInstance.start({ button: 0, pointerId: 1, clientX: 100, clientY: 100, currentTarget: target, preventDefault: vi.fn() } as unknown as PointerEvent, 0, side);
  }
  it('resizes from a side handle, commits once and clears guides on release', () => {
    const fixture = create(); const component = fixture.componentInstance;
    const resized = vi.fn(); const committed = vi.fn();
    component.resized.subscribe(resized); component.committed.subscribe(committed);
    startGesture(fixture, 'right');
    component.move({ pointerId: 1, clientX: 200, clientY: 100 } as PointerEvent);
    expect(resized).toHaveBeenLastCalledWith({ index: 0, x: .1, width: .7 });
    component.stop(); component.stop();
    expect(committed).toHaveBeenCalledTimes(1);
    expect(component.guides()).toEqual([]); expect(component.active()).toBe(false);
    expect(component.boxes()[0].font_size).toBe(40);
  });
  it('restores the original geometry on Escape without committing an edit', () => {
    const fixture = create(); const component = fixture.componentInstance;
    const resized = vi.fn(); const committed = vi.fn(); const cancelled = vi.fn();
    component.resized.subscribe(resized); component.committed.subscribe(committed); component.cancelled.subscribe(cancelled);
    startGesture(fixture, 'left');
    component.move({ pointerId: 1, clientX: 150, clientY: 100 } as PointerEvent);
    component.escape({ key: 'Escape', preventDefault: vi.fn() } as unknown as KeyboardEvent);
    expect(resized).toHaveBeenLastCalledWith({ index: 0, x: .1, width: .6 });
    expect(committed).not.toHaveBeenCalled(); expect(cancelled).toHaveBeenCalledTimes(1);
    expect(component.active()).toBe(false);
  });
  it('supports free movement with Alt and locks the other axis with Shift', () => {
    const fixture = create(); const component = fixture.componentInstance; const moved = vi.fn();
    component.moved.subscribe(moved); startGesture(fixture);
    component.move({ pointerId: 1, clientX: 197, clientY: 102, altKey: true, shiftKey: true } as PointerEvent);
    expect(moved).toHaveBeenLastCalledWith({ index: 0, x: .197, y: .2 });
    expect(component.guides()).toEqual([]);
  });
  it('lets the side handles resize by keyboard and request undo', () => {
    const fixture = create(); const component = fixture.componentInstance;
    const target = fixture.nativeElement.querySelector('.resize-handle.left');
    const resized = vi.fn(); const undo = vi.fn(); component.resized.subscribe(resized); component.undo.subscribe(undo);
    component.key({ key: 'ArrowRight', currentTarget: target, preventDefault: vi.fn() } as unknown as KeyboardEvent, 0, 'left');
    expect(resized.mock.calls[0][0].x).toBeCloseTo(.101); expect(resized.mock.calls[0][0].width).toBeCloseTo(.599);
    component.key({ key: 'z', ctrlKey: true, preventDefault: vi.fn() } as unknown as KeyboardEvent, 0);
    expect(undo).toHaveBeenCalledTimes(1);
  });
});
