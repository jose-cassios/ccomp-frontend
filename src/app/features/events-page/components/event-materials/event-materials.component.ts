import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, ElementRef, EventEmitter, effect, inject, Input, Output, signal, ViewChild } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { EventMaterial, EventMaterialsService, safeMaterialUrl } from '../../services/event-materials.service';
import { apiErrorMessage } from '../../../../core/api/api-error';
import { autoDismissFeedback } from '../../../../core/ui/feedback-auto-dismiss';

@Component({
  selector: 'app-event-materials', standalone: true, imports: [ReactiveFormsModule],
  templateUrl: './event-materials.component.html', styleUrl: './event-materials.component.css',
})
export class EventMaterialsComponent {
  @Input({ required: true }) eventId!: number;
  @Input() activityId?: number;
  @Input() manage = false;
  @Input() restrictedMessage = '';
  @Output() working = new EventEmitter<boolean>();
  private readonly reportWorking = effect(() => this.working.emit(this.busy()));
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;
  private readonly api = inject(EventMaterialsService);
  private readonly document = inject(DOCUMENT);
  private readonly destroy = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(255)]],
    description: ['', Validators.maxLength(1000)],
    url: ['', Validators.maxLength(2048)],
  });
  readonly rows = signal<EventMaterial[]>([]);
  readonly cursor = signal<string | null>(null);
  readonly loaded = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly adding = signal(false);
  readonly kind = signal<'LINK' | 'FILE'>('LINK');
  readonly file = signal<File | null>(null);
  readonly safeUrl = safeMaterialUrl;
  private downloadUrl: string | null = null;
  private readonly feedback = autoDismissFeedback(this.error, this.success, () => { this.error.set(''); this.success.set(''); });
  constructor() { this.destroy.onDestroy(() => { if (this.downloadUrl) URL.revokeObjectURL(this.downloadUrl); }); }
  open(event: Event): void {
    if (event.currentTarget !== event.target) return;
    if ((event.target as HTMLDetailsElement).open && !this.loaded()) this.load();
  }
  load(more = false): void {
    if (this.busy() || (more && !this.cursor())) return;
    this.busy.set(true); this.error.set('');
    this.api.list(this.eventId, this.activityId, more ? this.cursor()! : undefined).pipe(takeUntilDestroyed(this.destroy), finalize(() => this.busy.set(false))).subscribe({
      next: page => { this.loaded.set(true); this.rows.update(rows => more ? [...rows, ...page.content] : page.content); this.cursor.set(page.next_cursor); },
      error: error => this.error.set(error instanceof HttpErrorResponse && error.status === 403 && this.restrictedMessage
        ? this.restrictedMessage : apiErrorMessage(error, 'Não foi possível carregar os materiais.')),
    });
  }
  chooseFile(event: Event): void {
    const input = event.target as HTMLInputElement; const file = input.files?.[0] ?? null;
    this.file.set(null);
    if (!file) return;
    if (!file.size || file.size > 10 * 1024 * 1024 || !['application/pdf', 'image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      input.value = ''; this.error.set('Selecione um PDF, PNG, JPEG ou WebP de até 10 MB.'); return;
    }
    this.file.set(file); this.error.set('');
    if (!this.form.controls.title.value.trim()) this.form.controls.title.setValue(file.name.replace(/\.[^.]+$/, '').slice(0, 255));
  }
  save(): void {
    if (!this.manage || this.busy()) return;
    this.form.markAllAsTouched();
    const raw = this.form.getRawValue();
    const value = { title: raw.title.trim(), description: raw.description.trim(), url: raw.url.trim() };
    if (this.form.invalid || !value.title) { this.error.set('Revise o título e a descrição do material.'); return; }
    if (this.kind() === 'LINK' && !safeMaterialUrl(value.url)) { this.error.set('Informe um link completo começando com https:// ou http://.'); return; }
    if (this.kind() === 'FILE' && !this.file()) { this.error.set('Selecione o arquivo para enviar.'); return; }
    this.busy.set(true); this.error.set(''); this.success.set('');
    const request = this.kind() === 'FILE' ? this.api.upload(this.eventId, value, this.file()!, this.activityId) : this.api.addLink(this.eventId, value, this.activityId);
    request.pipe(takeUntilDestroyed(this.destroy), finalize(() => this.busy.set(false))).subscribe({
      next: row => {
        this.rows.update(rows => [row, ...rows.filter(item => item.id !== row.id)]);
        this.loaded.set(true);
        this.form.reset(); this.file.set(null); if (this.fileInput) this.fileInput.nativeElement.value = '';
        this.adding.set(false); this.success.set('Material adicionado.');
      },
      error: error => this.error.set(apiErrorMessage(error, 'Não foi possível adicionar o material.')),
    });
  }
  remove(row: EventMaterial): void {
    if (!this.manage || this.busy() || !window.confirm(`Remover o material “${row.title}”?`)) return;
    this.busy.set(true); this.error.set('');
    this.api.remove(this.eventId, row.id, this.activityId).pipe(takeUntilDestroyed(this.destroy), finalize(() => this.busy.set(false))).subscribe({
      next: () => { this.rows.update(rows => rows.filter(item => item.id !== row.id)); this.success.set('Material removido.'); },
      error: error => this.error.set(apiErrorMessage(error, 'Não foi possível remover o material.')),
    });
  }
  download(row: EventMaterial): void {
    if (this.busy() || row.type !== 'FILE') return;
    this.busy.set(true); this.error.set('');
    this.api.download(this.eventId, row.id, this.activityId).pipe(takeUntilDestroyed(this.destroy), finalize(() => this.busy.set(false))).subscribe({
      next: blob => {
        if (this.downloadUrl) URL.revokeObjectURL(this.downloadUrl);
        this.downloadUrl = URL.createObjectURL(blob);
        const link = this.document.createElement('a'); link.href = this.downloadUrl;
        const extension: Record<string, string> = { 'application/pdf': '.pdf', 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' };
        link.download = (row.original_file_name || row.title + (extension[blob.type] ?? '')).replace(/[\\/]/g, '-');
        this.document.body.appendChild(link); link.click(); link.remove(); this.success.set('Download iniciado.');
      },
      error: error => this.error.set(apiErrorMessage(error, 'Não foi possível baixar o arquivo.')),
    });
  }
}
