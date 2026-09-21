import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { StorageService } from '../../../../core/storage/storage.service';
import { apiErrorMessage } from '../../../../core/api/api-error';

@Component({
  standalone: true, imports: [ReactiveFormsModule],
  template: `
    <main>
      <h1>Arquivos da plataforma</h1>
      <p>Envie arquivos ou informe o nome exato retornado no envio. A API ainda não possui listagem de arquivos.</p>
      <label>Enviar arquivo<input type="file" [disabled]="busy()" (change)="upload($event)"></label>
      @if (url()) { <p>URL: <a [href]="url()" target="_blank" rel="noopener noreferrer">{{ url() }}</a></p> }
      <label>Nome do arquivo<input [formControl]="fileName" placeholder="Nome retornado pelo upload"></label>
      <button type="button" [disabled]="busy() || fileName.invalid" (click)="download()">Baixar arquivo</button>
      <button type="button" [disabled]="busy() || fileName.invalid" (click)="remove()">Excluir permanentemente</button>
      @if (busy()) { <p role="status"><span class="mini-spinner"></span> Processando…</p> }
      @if (message()) { <p role="status">{{ message() }}</p> }
      @if (error()) { <p role="alert">{{ error() }}</p> }
    </main>
  `,
  styles: `main {max-width:48rem; margin:2rem auto; padding:1.5rem} h1 {font-size:1.6rem} p {margin:1rem 0; line-height:1.6; overflow-wrap:anywhere} label,input {display:block; margin:.75rem 0; width:100%} input,button {padding:.75rem; border:1px solid var(--border-subtle); border-radius:.5rem; background:var(--surface-card); box-sizing:border-box} button {margin:.5rem .5rem 0 0; color:var(--brand-700); cursor:pointer}`,
})
export class AdminFilesComponent {
  private readonly service = inject(StorageService);
  readonly fileName = inject(FormBuilder).nonNullable.control('', [Validators.required, Validators.pattern(/^[^/\\]+$/)]);
  readonly busy = signal(false);
  readonly message = signal('');
  readonly error = signal('');
  readonly url = signal('');
  private start() { this.busy.set(true); this.error.set(''); this.message.set(''); }
  upload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || this.busy()) return;
    this.start();
    this.service.upload(file).pipe(finalize(() => { this.busy.set(false); input.value = ''; })).subscribe({
      next: (result) => { this.fileName.setValue(result.file_name); this.url.set(result.url); this.message.set('Arquivo enviado. Guarde o nome e a URL para usar no conteúdo.'); },
      error: (e: unknown) => this.error.set(apiErrorMessage(e, 'Não foi possível enviar o arquivo.')),
    });
  }
  download() {
    if (this.busy() || this.fileName.invalid) return;
    this.start();
    this.service.download(this.fileName.value.trim()).pipe(finalize(() => this.busy.set(false))).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a'); anchor.href = url; anchor.download = this.fileName.value;
        anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        this.message.set('Download iniciado.');
      },
      error: (e: unknown) => this.error.set(apiErrorMessage(e, 'Não foi possível baixar o arquivo.')),
    });
  }
  remove() {
    const name = this.fileName.value.trim();
    if (this.busy() || this.fileName.invalid || !window.confirm(`Excluir permanentemente “${name}”? Links que usam esse arquivo deixarão de funcionar. Esta ação não pode ser desfeita.`)) return;
    this.start();
    this.service.delete(name).pipe(finalize(() => this.busy.set(false))).subscribe({
      next: () => { this.fileName.setValue(''); this.url.set(''); this.message.set('Arquivo excluído permanentemente.'); },
      error: (e: unknown) => this.error.set(apiErrorMessage(e, 'Não foi possível excluir o arquivo.')),
    });
  }
}
