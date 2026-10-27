import { Component, DestroyRef, HostListener, OnInit, inject, signal } from '@angular/core';
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

@Component({
  selector: 'app-event-certificates',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
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
  readonly eventId = Number(this.route.snapshot.paramMap.get('id'));
  readonly event = signal<EventDetails | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly allowed = signal(false);
  readonly busy = signal(false);
  readonly scope = signal<CertificateScope>('event');
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

  constructor() {
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
    this.error.set(null); this.success.set(null);
  }

  addBox(): void {
    if (this.busy() || this.boxes.length >= 30) return;
    this.boxes.push(this.boxForm()); this.form.markAsDirty();
  }

  removeBox(index: number): void {
    if (this.busy() || this.boxes.length <= 1) return;
    this.boxes.removeAt(index); this.form.markAsDirty();
  }

  insertVariable(index: number, value: string): void {
    if (!value || this.busy() || !this.variableAvailable(value)) return;
    const control = this.boxes.at(index).controls.text_template;
    control.setValue(`${control.value}${value}`); control.markAsDirty();
  }

  variableAvailable(value: string): boolean {
    return value !== '{evento.organizacao}' && (this.scope() === 'activity' || !value.startsWith('{atividade.'));
  }

  save(): void {
    if (this.busy() || !this.allowed()) return;
    if (this.form.invalid || !this.boxes.length) {
      this.form.markAllAsTouched();
      this.error.set('Revise as caixas de texto: preencha o conteúdo e os valores dentro dos limites indicados.');
      return;
    }
    const form = this.form;
    this.run(this.api.saveTemplate(this.eventId, this.scope(), form.getRawValue().boxes).pipe(
      tap(() => { form.markAsPristine(); this.success.set('Modelo salvo. Gerando prévia…'); }),
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
