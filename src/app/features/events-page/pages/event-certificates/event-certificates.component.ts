import { ChangeDetectorRef, Component, DestroyRef, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EMPTY, Observable, expand, finalize, forkJoin, map, of, reduce, switchMap, tap, throwError } from 'rxjs';
import { apiErrorMessage } from '../../../../core/api/api-error';
import { autoDismissFeedback } from '../../../../core/ui/feedback-auto-dismiss';
import { AuthService } from '../../../auth/services/auth.service';
import { CertificateAlignment, CertificateBox, CertificateScope } from '../../models/certificate.model';
import { EventDetails } from '../../models/event.model';
import { EventsService } from '../../services/events.service';
import { CertificatesService } from '../../services/certificates.service';
import { CertificateCanvasComponent, CertificateGeometry, CertificateTransform } from '../../components/certificate-canvas/certificate-canvas.component';
import { certificateColor, certificateHex } from '../../models/certificate-design';

@Component({
  selector: 'app-event-certificates',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CertificateCanvasComponent],
  templateUrl: './event-certificates.component.html',
  styleUrl: './event-certificates.component.css',
})
export class EventCertificatesComponent implements OnInit {
  private readonly api = inject(CertificatesService);
  private readonly events = inject(EventsService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly destroyRef = inject(DestroyRef);
  private readonly changeDetector = inject(ChangeDetectorRef);
  readonly eventId = Number(this.route.snapshot.paramMap.get('id'));
  readonly event = signal<EventDetails | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly allowed = signal(false);
  readonly busy = signal(false);
  readonly scope = signal<CertificateScope>('event');
  readonly selectedBox = signal(0);
  readonly undoStack = signal<CertificateTransform[]>([]);
  readonly redoStack = signal<CertificateTransform[]>([]);
  private canvasWasDirty = false;
  readonly imageSize = signal({ width: 1600, height: 1131 });
  readonly color = certificateColor;
  readonly alignments: { value: CertificateAlignment; label: string; path: string }[] = [
    { value: 'LEFT', label: 'Alinhar à esquerda', path: 'M3 4h14M3 8h9M3 12h14M3 16h9' },
    { value: 'CENTERED', label: 'Centralizar texto', path: 'M3 4h14M6 8h8M3 12h14M6 16h8' },
    { value: 'RIGHT', label: 'Alinhar à direita', path: 'M3 4h14M8 8h9M3 12h14M8 16h9' },
    { value: 'JUSTIFIED', label: 'Justificar texto', path: 'M3 4h14M3 8h14M3 12h14M3 16h14' },
  ];
  readonly palette = [
    { color: '#123b6a', name: 'Azul CCOMP' }, { color: '#2e74b5', name: 'Azul claro' },
    { color: '#17263a', name: 'Grafite' }, { color: '#000000', name: 'Preto' },
    { color: '#ffffff', name: 'Branco' }, { color: '#8f5010', name: 'Dourado' },
  ];
  readonly samples = computed(() => ({
    '{participante.nome}': 'Maria da Silva', '{evento.title}': this.event()?.title ?? 'Nome do evento',
    '{evento.local}': this.event()?.address || 'Local do evento', '{evento.carga_horaria}': '20',
    '{atividade.nome}': 'Atividade de exemplo', '{atividade.local}': 'Local da atividade',
    '{atividade.carga_horaria}': '4 horas', '{validacao.codigo}': 'EXEMPLO',
    '{validacao.url}': 'site/validar/EXEMPLO',
  }));
  readonly removedBox = signal<{ scope: CertificateScope; index: number; box: CertificateBox } | null>(null);
  readonly variables = signal<string[]>([]);
  readonly variableLabels: Record<string, string> = {
    '{participante.nome}': 'Nome do participante',
    '{evento.title}': 'Nome do evento',
    '{evento.local}': 'Local do evento',
    '{evento.carga_horaria}': 'Carga horária do evento',
    '{atividade.nome}': 'Nome da atividade',
    '{atividade.local}': 'Local da atividade',
    '{atividade.carga_horaria}': 'Carga horária da atividade',
    '{evento.organizacao}': 'Organização (ainda não disponível)',
    '{validacao.codigo}': 'Código de validação',
    '{validacao.url}': 'Link de validação',
  };
  readonly coverUrl = signal<string | null>(null);
  readonly previewUrl = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly forms = {
    event: this.fb.group({ boxes: new FormArray<ReturnType<EventCertificatesComponent['boxForm']>>([]) }),
    activity: this.fb.group({ boxes: new FormArray<ReturnType<EventCertificatesComponent['boxForm']>>([]) }),
  };
  private readonly feedback = autoDismissFeedback(this.error, this.success, () => {
    this.error.set(null); this.success.set(null);
  });

  get form() { return this.forms[this.scope()]; }
  get boxes() { return this.form.controls.boxes; }
  get unsaved() { return this.forms.event.dirty || this.forms.activity.dirty; }
  get designBoxes(): CertificateBox[] { return this.boxes.getRawValue(); }
  get hasValidation(): boolean { return this.designBoxes.some(box => /\{validacao\.(codigo|url)\}/.test(box.text_template)); }

  constructor() {
    // Forms also change through presets, dragging and API responses in zoneless mode.
    for (const form of Object.values(this.forms)) {
      form.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.changeDetector.markForCheck());
    }
    this.destroyRef.onDestroy(() => {
      this.setImage(this.coverUrl, null); this.setImage(this.previewUrl, null);
    });
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    if (!Number.isSafeInteger(this.eventId) || this.eventId <= 0) {
      this.loadError.set('Evento inválido.'); this.loading.set(false); return;
    }
    this.loading.set(true); this.loadError.set(null);
    this.events.getById(this.eventId).pipe(
      tap(event => this.event.set(event)),
      switchMap(event => this.canManage(event)),
      switchMap(allowed => {
        this.allowed.set(allowed);
        if (!allowed) return EMPTY;
        return forkJoin({
          event: this.api.template(this.eventId, 'event'),
          activity: this.api.template(this.eventId, 'activity'),
          variables: this.api.variables(), cover: this.api.cover(this.eventId),
        });
      }),
      takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false)),
    ).subscribe({
      next: result => {
        for (const scope of ['event', 'activity'] as const) {
          const boxes = this.forms[scope].controls.boxes;
          boxes.clear(); result[scope].boxes.forEach(box => boxes.push(this.boxForm(box)));
          this.forms[scope].markAsPristine();
        }
        this.variables.set(result.variables); this.setImage(this.coverUrl, result.cover);
      },
      error: error => this.loadError.set(apiErrorMessage(error, 'Não foi possível carregar os certificados. Tente novamente.')),
    });
  }

  selectScope(scope: CertificateScope): void {
    if (this.busy()) return;
    this.scope.set(scope); this.setImage(this.previewUrl, null);
    this.selectedBox.set(0);
    this.clearTransformHistory();
    this.error.set(null); this.success.set(null);
  }

  addBox(kind: 'text' | 'title' | 'participant' | 'validation' = 'text'): void {
    if (this.busy() || this.boxes.length >= 30) return;
    if (kind === 'validation' && this.hasValidation) return;
    this.clearTransformHistory();
    const font = Math.max(8, Math.min(300, Math.round(this.imageSize().width * .024)));
    const presets: Record<typeof kind, Partial<CertificateBox>> = {
      text: { text_template: 'Seu texto aqui', y: Math.min(.8, .45 + this.boxes.length * .04) },
      title: { text_template: '**CERTIFICADO**', y: .2, font_size: Math.min(300, font * 2) },
      participant: { text_template: '**{participante.nome}**', y: .38, font_size: Math.min(300, Math.round(font * 1.3)) },
      // Including event title also supports the backend's activity validation lookup.
      validation: { text_template: 'Código de validação: {validacao.codigo}\n{evento.title}', y: .85, font_size: Math.max(8, Math.round(font * .55)) },
    };
    this.boxes.push(this.boxForm({ x: .15, y: .5, width: .7, font_size: font,
      font_color: '#123b6a', alignment: 'CENTERED', text_template: '', ...presets[kind] }));
    this.selectedBox.set(this.boxes.length - 1); this.form.markAsDirty();
  }

  removeBox(index: number): void {
    if (this.busy() || this.boxes.length <= 1) return;
    this.clearTransformHistory();
    this.removedBox.set({ scope: this.scope(), index, box: this.boxes.at(index).getRawValue() });
    this.boxes.removeAt(index); this.form.markAsDirty();
    this.selectedBox.set(Math.min(index, this.boxes.length - 1));
  }

  undoRemove(): void {
    const removed = this.removedBox();
    if (!removed || this.busy() || removed.scope !== this.scope() || this.boxes.length >= 30) return;
    this.clearTransformHistory();
    this.boxes.insert(removed.index, this.boxForm(removed.box)); this.form.markAsDirty();
    this.selectedBox.set(removed.index); this.removedBox.set(null);
  }

  duplicate(index: number): void {
    if (this.busy() || this.boxes.length >= 30) return;
    this.clearTransformHistory();
    const box = this.boxes.at(index).getRawValue();
    this.boxes.push(this.boxForm({ ...box, y: Math.min(.9, box.y + .05) }));
    this.selectedBox.set(this.boxes.length - 1); this.form.markAsDirty();
  }

  insertVariable(index: number, value: string, textarea?: HTMLTextAreaElement): void {
    if (!value || this.busy() || !this.variableAvailable(value)) return;
    const control = this.boxes.at(index).controls.text_template;
    const start = textarea?.selectionStart ?? control.value.length;
    const end = textarea?.selectionEnd ?? start;
    control.setValue(control.value.slice(0, start) + value + control.value.slice(end)); control.markAsDirty();
    if (textarea) {
      textarea.value = control.value; textarea.focus();
      textarea.setSelectionRange(start + value.length, start + value.length);
    }
  }

  formatText(index: number, marker: '**' | '*', textarea: HTMLTextAreaElement): void {
    if (this.busy()) return;
    const control = this.boxes.at(index).controls.text_template;
    const start = textarea.selectionStart; const end = textarea.selectionEnd;
    const selected = control.value.slice(start, end) || 'seu texto';
    control.setValue(control.value.slice(0, start) + marker + selected + marker + control.value.slice(end));
    control.markAsDirty(); textarea.value = control.value; textarea.focus();
    textarea.setSelectionRange(start + marker.length, start + marker.length + selected.length);
  }

  setColor(index: number, rgb: string): void {
    if (this.busy() || !/^#[\da-f]{6}$/i.test(rgb)) return;
    const control = this.boxes.at(index).controls.font_color;
    control.setValue(certificateHex(rgb, certificateColor(control.value).opacity)); control.markAsDirty();
  }

  setAlignment(index: number, alignment: CertificateAlignment): void {
    if (this.busy()) return;
    const control = this.boxes.at(index).controls.alignment;
    control.setValue(alignment); control.markAsDirty();
  }

  explainUnderline(): void {
    this.error.set('Sublinhado ainda não está disponível na emissão de certificados. O backend precisa oferecer esse formato.');
  }

  setOpacity(index: number, value: string): void {
    if (this.busy() || !value.trim() || !Number.isFinite(Number(value))) return;
    const control = this.boxes.at(index).controls.font_color;
    control.setValue(certificateHex(certificateColor(control.value).rgb, Number(value))); control.markAsDirty();
  }

  percent(value: number): number { return Math.round(value * 100); }

  position(index: number, key: 'x' | 'y' | 'width', value: string): void {
    if (this.busy() || !value.trim() || !Number.isFinite(Number(value))) return;
    this.clearTransformHistory();
    const box = this.boxes.at(index);
    const fraction = Math.max(key === 'width' ? .01 : 0, Math.min(1, Number(value) / 100));
    if (key === 'x') box.controls.x.setValue(Math.min(fraction, 1 - box.controls.width.value));
    else if (key === 'width') {
      box.controls.width.setValue(fraction);
      box.controls.x.setValue(Math.min(box.controls.x.value, 1 - fraction));
    }
    else box.controls.y.setValue(fraction);
    box.markAsDirty();
  }

  moveBox(move: { index: number; x: number; y: number }): void {
    if (this.busy()) return;
    this.boxes.at(move.index).patchValue({ x: move.x, y: move.y }); this.form.markAsDirty();
  }

  changeCanvasText(change: { index: number; text: string }): void {
    if (this.busy()) return;
    const control = this.boxes.at(change.index).controls.text_template;
    control.setValue(change.text); control.markAsDirty();
  }

  resizeBox(change: { index: number; x: number; width: number }): void {
    if (this.busy()) return;
    this.boxes.at(change.index).patchValue({ x: change.x, width: change.width }); this.form.markAsDirty();
  }

  beginCanvasEdit(): void { this.canvasWasDirty = this.form.dirty; }

  cancelCanvasEdit(): void { if (!this.canvasWasDirty) this.form.markAsPristine(); }

  rememberTransform(transform: CertificateTransform): void {
    this.undoStack.update(items => [...items.slice(-49), transform]); this.redoStack.set([]);
  }

  undoTransform(): void { this.restoreTransform(false); }
  redoTransform(): void { this.restoreTransform(true); }

  private restoreTransform(redo: boolean): void {
    if (this.busy()) return;
    const source = redo ? this.redoStack : this.undoStack;
    const target = redo ? this.undoStack : this.redoStack;
    const change = source().at(-1);
    if (!change) return;
    const box = this.boxes.at(change.index);
    const expected = redo ? change.before : change.after;
    // Do not overwrite newer geometry edits made using another control.
    if (!box || (Object.keys(expected) as (keyof CertificateGeometry)[])
      .some(key => Math.abs(box.controls[key].value - expected[key]) > 1e-8)) {
      this.clearTransformHistory(); return;
    }
    box.patchValue(redo ? change.after : change.before); this.form.markAsDirty();
    this.selectedBox.set(change.index); source.update(items => items.slice(0, -1)); target.update(items => [...items, change]);
  }

  private clearTransformHistory(): void { this.undoStack.set([]); this.redoStack.set([]); }

  centerBox(index: number): void {
    if (this.busy()) return;
    this.clearTransformHistory();
    const box = this.boxes.at(index);
    box.controls.x.setValue((1 - box.controls.width.value) / 2); box.markAsDirty();
  }

  boxLabel(index: number): string {
    return this.boxes.at(index).controls.text_template.value
      .replace(/\{[^{}]+\}/g, token => this.variableLabels[token] ?? token).replace(/[*~]/g, '').trim() || `Texto ${index + 1}`;
  }

  variableAvailable(value: string): boolean {
    return value !== '{evento.organizacao}' && (this.scope() === 'activity' || !value.startsWith('{atividade.'));
  }

  save(): void {
    if (this.busy() || !this.allowed()) return;
    if (this.form.invalid || !this.boxes.length) {
      this.form.markAllAsTouched();
      const invalidIndex = this.boxes.controls.findIndex(box => box.invalid);
      if (invalidIndex >= 0) this.selectedBox.set(invalidIndex);
      this.error.set('Revise as caixas de texto: preencha o conteúdo e os valores dentro dos limites indicados.');
      return;
    }
    const form = this.form;
    this.run(this.api.saveTemplate(this.eventId, this.scope(), form.getRawValue().boxes).pipe(
      tap(() => { form.markAsPristine(); this.clearTransformHistory(); this.removedBox.set(null); this.success.set('Modelo salvo. Gerando prévia…'); }),
      switchMap(() => this.api.preview(this.eventId, this.scope())),
    ), blob => { this.setImage(this.previewUrl, blob); this.success.set('Modelo salvo. Confira a prévia abaixo.'); },
    'Não foi possível concluir. Se o modelo já foi salvo, tente visualizar novamente.');
  }

  preview(): void {
    this.run(this.api.preview(this.eventId, this.scope()), blob => this.setImage(this.previewUrl, blob),
      'Não foi possível gerar a prévia do modelo salvo.');
  }

  upload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0]; input.value = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      this.error.set('Selecione uma imagem PNG, JPEG ou WebP.'); return;
    }
    this.run(this.api.uploadCover(this.eventId, file).pipe(
      tap(() => this.setImage(this.previewUrl, null)), switchMap(() => this.api.cover(this.eventId)),
    ), blob => { this.setImage(this.coverUrl, blob); this.success.set('Fundo atualizado para o evento e suas atividades.'); },
    'Não foi possível atualizar ou carregar o fundo.');
  }

  restoreCover(): void {
    if (this.busy() || !window.confirm('Remover o fundo personalizado e voltar à imagem padrão?')) return;
    this.run(this.api.deleteCover(this.eventId).pipe(
      tap(() => this.setImage(this.previewUrl, null)), switchMap(() => this.api.cover(this.eventId)),
    ), blob => { this.setImage(this.coverUrl, blob); this.success.set('Fundo padrão restaurado.'); },
    'Não foi possível restaurar o fundo padrão.');
  }

  canDeactivate(): boolean {
    if (!this.unsaved && !this.busy()) return true;
    return window.confirm(this.busy()
      ? 'Há uma operação em andamento. Ao sair, seu resultado pode não ser exibido. Deseja sair?'
      : 'Há alterações não salvas nos certificados. Deseja sair?');
  }

  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent): void {
    if (this.unsaved || this.busy()) event.preventDefault();
  }

  private boxForm(box?: CertificateBox) {
    return this.fb.group({
      text_template: [box?.text_template ?? '', [Validators.required, Validators.maxLength(2000), Validators.pattern(/\S/)]],
      x: [box?.x ?? .15, [Validators.required, Validators.min(0), Validators.max(1)]],
      y: [box?.y ?? .5, [Validators.required, Validators.min(0), Validators.max(1)]],
      width: [box?.width ?? .7, [Validators.required, Validators.min(.01), Validators.max(1)]],
      font_size: [box?.font_size ?? 40, [Validators.required, Validators.min(8), Validators.max(300)]],
      font_color: [box?.font_color ?? '#000000', [Validators.required, Validators.pattern(/^#([a-fA-F0-9]{6}|[a-fA-F0-9]{8})$/)]],
      alignment: [box?.alignment ?? 'LEFT' as CertificateAlignment, Validators.required],
    });
  }

  private canManage(event: EventDetails): Observable<boolean> {
    if (this.auth.hasAnyRole(['ADM', 'MODERATOR']) || Boolean(event.owner_id && event.owner_id === this.auth.currentUserState()?.id)) return of(true);
    const cursors = new Set<string>();
    return this.events.getEditableEvents().pipe(
      expand(page => {
        if (page.content.some(item => item.id === event.id) || !page.next_cursor) return EMPTY;
        if (cursors.has(page.next_cursor)) return throwError(() => new Error('Cursor repetido.'));
        cursors.add(page.next_cursor);
        return this.events.getEditableEvents(page.next_cursor);
      }),
      map(page => page.content.some(item => item.id === event.id)), reduce((found, current) => found || current, false),
    );
  }

  private run<T>(request: Observable<T>, next: (value: T) => void, fallback: string): void {
    if (this.busy() || !this.allowed()) return;
    this.busy.set(true); this.error.set(null); this.success.set(null);
    request.pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.busy.set(false))).subscribe({
      next, error: error => { this.success.set(null); this.error.set(apiErrorMessage(error, fallback)); },
    });
  }

  private setImage(target: ReturnType<typeof signal<string | null>>, blob: Blob | null): void {
    const previous = target();
    if (previous) URL.revokeObjectURL(previous);
    target.set(blob ? URL.createObjectURL(blob) : null);
  }
}
