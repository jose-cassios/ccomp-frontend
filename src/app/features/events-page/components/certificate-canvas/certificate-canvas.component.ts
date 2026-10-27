import { Component, DestroyRef, ElementRef, HostListener, afterEveryRender, computed, inject, input, output, signal } from '@angular/core';
import { CertificateBox } from '../../models/certificate.model';
import { certificateColor, certificateTextRuns } from '../../models/certificate-design';
import { AlignmentGuide, DesignRect, SpacingGuide, snapMove, snapResize } from '../../models/certificate-guides';

export interface CertificateGeometry { x: number; y: number; width: number; }
export interface CertificateTransform { index: number; before: CertificateGeometry; after: CertificateGeometry; }
interface Gesture {
  index: number; id: number; startX: number; startY: number;
  original: DesignRect; current: DesignRect; peers: DesignRect[];
  viewport: { width: number; height: number };
  side?: 'left' | 'right'; target: HTMLElement;
}

@Component({
  selector: 'app-certificate-canvas',
  standalone: true,
  templateUrl: './certificate-canvas.component.html',
  styleUrl: './certificate-canvas.component.css',
})
export class CertificateCanvasComponent {
  private readonly element: ElementRef<HTMLElement> = inject(ElementRef);
  readonly cover = input.required<string>();
  readonly boxes = input.required<CertificateBox[]>();
  readonly selected = input(0);
  readonly disabled = input(false);
  readonly samples = input<Record<string, string>>({});
  readonly canUndo = input(false);
  readonly canRedo = input(false);
  readonly undo = output<void>();
  readonly redo = output<void>();
  readonly selectedChange = output<number>();
  readonly moved = output<{ index: number; x: number; y: number }>();
  readonly resized = output<{ index: number; x: number; width: number }>();
  readonly editStarted = output<void>();
  readonly committed = output<CertificateTransform>();
  readonly cancelled = output<void>();
  readonly dimensions = output<{ width: number; height: number }>();
  readonly imageWidth = signal(1600);
  readonly imageError = signal(false);
  readonly zoom = signal(100);
  readonly guides = signal<AlignmentGuide[]>([]);
  readonly gaps = signal<SpacingGuide[]>([]);
  readonly equalWidth = signal(false);
  readonly active = signal(false);
  readonly overflow = signal(false);
  readonly announcement = signal('');
  readonly rendered = computed(() => this.boxes().map(box => ({
    ...box, runs: certificateTextRuns(box.text_template, this.samples()),
    color: certificateColor(box.font_color).css,
    align: ({ LEFT: 'left', RIGHT: 'right', CENTERED: 'center', JUSTIFIED: 'justify' } as const)[box.alignment ?? 'LEFT'],
  })));
  private drag: Gesture | null = null;

  constructor() {
    // Text height changes as its width changes. Read the actual browser layout.
    afterEveryRender({ read: () => {
      const canvas = this.element.nativeElement.querySelector<HTMLElement>('.canvas');
      const selected = canvas?.querySelector<HTMLElement>('.text-box.selected');
      if (!canvas || !selected) { this.overflow.set(false); return; }
      const page = canvas.getBoundingClientRect(); const text = selected.getBoundingClientRect();
      this.overflow.set(page.height > 0 && (text.bottom > page.bottom + 1 || text.right > page.right + 1));
    } });
    inject(DestroyRef).onDestroy(() => this.release());
  }

  loaded(event: Event): void {
    const image = event.target as HTMLImageElement;
    this.imageWidth.set(image.naturalWidth || 1600);
    this.imageError.set(false);
    this.dimensions.emit({ width: image.naturalWidth, height: image.naturalHeight });
  }

  start(event: PointerEvent, index: number, side?: 'left' | 'right'): void {
    if (this.disabled() || this.drag || event.button !== 0) return;
    const target = event.currentTarget as HTMLElement;
    const shell = target.closest<HTMLElement>('.text-box');
    const canvas = shell?.parentElement;
    if (!canvas || !shell) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    event.preventDefault();
    this.selectedChange.emit(index); target.focus({ preventScroll: true });
    const heights = Array.from(canvas.querySelectorAll<HTMLElement>('.text-box')).map(item => item.getBoundingClientRect().height / rect.height);
    const original = { ...this.geometry(this.boxes()[index]), height: heights[index] || 0 };
    this.drag = { index, id: event.pointerId, startX: event.clientX, startY: event.clientY,
      original, current: original,
      peers: this.boxes().map((box, i) => ({ ...this.geometry(box), height: heights[i] || 0 })).filter((_, i) => i !== index),
      viewport: { width: rect.width, height: rect.height }, side, target };
    this.editStarted.emit(); this.active.set(true);
    target.setPointerCapture(event.pointerId);
  }

  move(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || drag.id !== event.pointerId) return;
    if (this.disabled()) { this.cancel(); return; }
    let dx = event.clientX - drag.startX; let dy = event.clientY - drag.startY;
    if (event.shiftKey && !drag.side) {
      if (Math.abs(dx) >= Math.abs(dy)) dy = 0; else dx = 0;
    }
    const enabled = !event.altKey;
    const result = drag.side
      ? snapResize(drag.original, (drag.side === 'left' ? drag.original.x : drag.original.x + drag.original.width) + dx / drag.viewport.width,
          drag.side, drag.peers, drag.viewport.width, enabled)
      : snapMove({ ...drag.original, x: drag.original.x + dx / drag.viewport.width, y: drag.original.y + dy / drag.viewport.height },
          drag.peers, drag.viewport, enabled);
    // Shift keeps the locked axis unchanged, including its snap correction.
    if (event.shiftKey && !drag.side) {
      const locked = Math.abs(event.clientX - drag.startX) >= Math.abs(event.clientY - drag.startY) ? 'y' : 'x';
      result.rect[locked] = drag.original[locked];
      result.guides = result.guides.filter(guide => guide.axis !== locked);
      result.gaps = result.gaps.filter(gap => gap.axis !== locked);
    }
    drag.current = result.rect;
    this.guides.set(result.guides); this.gaps.set(result.gaps); this.equalWidth.set(Boolean(result.equalWidth));
    if (drag.side) this.resized.emit({ index: drag.index, x: result.rect.x, width: result.rect.width });
    else this.moved.emit({ index: drag.index, x: result.rect.x, y: result.rect.y });
  }

  stop(event?: PointerEvent): void {
    const drag = this.drag;
    if (!drag || (event && event.pointerId !== drag.id)) return;
    const before = this.geometry(drag.original); const after = this.geometry(drag.current);
    this.release();
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      this.committed.emit({ index: drag.index, before, after });
      this.announcement.set(drag.side ? 'Largura do texto ajustada.' : 'Posição do texto ajustada.');
    } else this.cancelled.emit();
  }

  cancel(): void {
    const drag = this.drag;
    if (!drag) return;
    this.release();
    if (drag.side) this.resized.emit({ index: drag.index, x: drag.original.x, width: drag.original.width });
    else this.moved.emit({ index: drag.index, x: drag.original.x, y: drag.original.y });
    this.cancelled.emit(); this.announcement.set('Ajuste cancelado.');
  }

  @HostListener('document:keydown', ['$event'])
  escape(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.drag) { event.preventDefault(); this.cancel(); }
  }

  @HostListener('window:blur')
  blurred(): void { this.cancel(); }

  key(event: KeyboardEvent, index: number, side?: 'left' | 'right'): void {
    if (this.disabled() || this.drag) return;
    if ((event.ctrlKey || event.metaKey) && ['z', 'y'].includes(event.key.toLowerCase())) {
      event.preventDefault();
      if (event.key.toLowerCase() === 'y' || event.shiftKey) this.redo.emit(); else this.undo.emit();
      return;
    }
    const keys = side ? ['ArrowLeft', 'ArrowRight'] : ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const box = this.boxes()[index]; const before = this.geometry(box);
    const target = event.currentTarget as HTMLElement;
    const shell = target.closest<HTMLElement>('.text-box');
    const height = shell?.parentElement?.getBoundingClientRect().height || 0;
    const textHeight = height ? (shell?.getBoundingClientRect().height || 0) / height : 0;
    const step = event.shiftKey ? .01 : .001;
    this.editStarted.emit();
    let after: CertificateGeometry;
    if (side) {
      const edge = (side === 'left' ? box.x : box.x + box.width) + (event.key === 'ArrowLeft' ? -step : step);
      after = this.geometry(snapResize({ ...before, height: textHeight }, edge, side, [], 0, false).rect);
      this.resized.emit({ index, x: after.x, width: after.width });
    } else {
      after = this.geometry(snapMove({ ...before, height: textHeight,
        x: box.x + (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0),
        y: box.y + (event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0),
      }, [], { width: 0, height: 0 }, false).rect);
      this.moved.emit({ index, x: after.x, y: after.y });
    }
    if (JSON.stringify(before) !== JSON.stringify(after)) this.committed.emit({ index, before, after });
    else this.cancelled.emit();
  }

  private geometry(box: CertificateGeometry): CertificateGeometry { return { x: box.x, y: box.y, width: box.width }; }

  private release(): void {
    const drag = this.drag; this.drag = null;
    this.active.set(false); this.guides.set([]); this.gaps.set([]); this.equalWidth.set(false);
    if (drag?.target.hasPointerCapture?.(drag.id)) drag.target.releasePointerCapture(drag.id);
  }
}
