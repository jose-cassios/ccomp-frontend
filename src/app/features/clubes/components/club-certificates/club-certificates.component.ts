import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { apiErrorMessage } from '../../../../core/api/api-error';
import { autoDismissFeedback } from '../../../../core/ui/feedback-auto-dismiss';
import { ClubMemberRole } from '../../models/clube.model';
import { ClubCertificatesService } from '../../services/club-certificates.service';

@Component({
  selector: 'app-club-certificate-download',
  template: `<button type="button" [disabled]="busy()" (click)="download()" [attr.aria-busy]="busy()">
    @if (busy()) { <span class="spinner" aria-hidden="true"></span> Emitindo… } @else { {{ recipient ? 'Baixar certificado' : 'Solicitar meu certificado' }} }
    </button>
    @if (error()) { <p role="alert">{{ error() }}</p> }
    @if (success()) { <p role="status">{{ success() }}</p> }`,
  styleUrl: './club-certificates.component.css',
})
export class ClubCertificateDownloadComponent {
  @Input({ required: true }) clubId!: number;
  @Input() recipient?: { id: string; role: ClubMemberRole };
  @Output() working = new EventEmitter<boolean>();
  private readonly api = inject(ClubCertificatesService);
  private readonly document = inject(DOCUMENT);
  private readonly destroy = inject(DestroyRef);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  private url: string | null = null;
  private readonly feedback = autoDismissFeedback(this.error, this.success, () => { this.error.set(''); this.success.set(''); });
  constructor() { this.destroy.onDestroy(() => { if (this.url) URL.revokeObjectURL(this.url); }); }
  download(): void {
    if (this.busy()) return;
    this.busy.set(true); this.working.emit(true); this.error.set(''); this.success.set('');
    this.api.download(this.clubId, this.recipient).pipe(takeUntilDestroyed(this.destroy), finalize(() => { this.busy.set(false); this.working.emit(false); })).subscribe({
      next: blob => {
        if (this.url) URL.revokeObjectURL(this.url);
        this.url = URL.createObjectURL(blob);
        const link = this.document.createElement('a'); link.href = this.url; link.download = `certificado-clube-${this.clubId}.png`;
        this.document.body.appendChild(link); link.click(); link.remove(); this.success.set('Download iniciado.');
      },
      error: error => this.error.set(apiErrorMessage(error, 'Não foi possível emitir o certificado. Sua participação precisa estar concluída.')),
    });
  }
}

@Component({
  selector: 'app-club-certificates', imports: [ReactiveFormsModule, ClubCertificateDownloadComponent],
  template: `<details (toggle)="open($event)">
    <summary>Certificados</summary>
    <div class="panel">
      @if (self) {
        <p>O certificado fica disponível quando a gestão conclui sua participação no clube.</p>
        <app-club-certificate-download [clubId]="clubId" (working)="selfBusy.set($event); reportWorking()" />
      }
      @if (manage) {
        <p>Defina a carga horária antes de emitir os certificados. Certificados já emitidos mantêm a carga horária original.</p>
        @if (loading()) { <p role="status"><span class="spinner" aria-hidden="true"></span> Carregando configuração…</p> }
        @if (!loaded() && !loading()) { <button type="button" (click)="load()">Carregar configuração</button> }
        @if (loaded()) {
          <form [formGroup]="form" (ngSubmit)="save()">
            <label>Membros · horas<input type="number" min="0" step="any" [readOnly]="saving()" formControlName="member_workload_hours" /></label>
            <label>Instrutores · horas<input type="number" min="0" step="any" [readOnly]="saving()" formControlName="instructor_workload_hours" /></label>
            <button type="submit" [disabled]="saving() || form.invalid">{{ saving() ? 'Salvando…' : 'Salvar carga horária' }}</button>
          </form>
        }
      }
      @if (error()) { <p role="alert">{{ error() }}</p> }
      @if (success()) { <p role="status">{{ success() }}</p> }
    </div>
  </details>`,
  styleUrl: './club-certificates.component.css',
})
export class ClubCertificatesComponent {
  @Input({ required: true }) clubId!: number;
  @Input() manage = false;
  @Input() self = false;
  @Output() working = new EventEmitter<boolean>();
  private readonly api = inject(ClubCertificatesService);
  private readonly fb = inject(FormBuilder);
  private readonly destroy = inject(DestroyRef);
  readonly form = this.fb.nonNullable.group({ member_workload_hours: [0, [Validators.required, Validators.min(0)]], instructor_workload_hours: [0, [Validators.required, Validators.min(0)]] });
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly selfBusy = signal(false);
  reportWorking(): void { this.working.emit(this.saving() || this.selfBusy()); }
  readonly loaded = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  private readonly feedback = autoDismissFeedback(this.error, this.success, () => { this.error.set(''); this.success.set(''); });
  open(event: Event): void {
    if (event.target === event.currentTarget && (event.target as HTMLDetailsElement).open && this.manage && !this.loaded()) this.load();
  }
  load(): void {
    if (!this.manage || this.loading()) return;
    this.loading.set(true); this.error.set('');
    this.api.workload(this.clubId).pipe(takeUntilDestroyed(this.destroy), finalize(() => this.loading.set(false))).subscribe({
      next: value => { this.form.patchValue(value); this.loaded.set(true); },
      error: error => this.error.set(apiErrorMessage(error, 'Não foi possível carregar a carga horária.')),
    });
  }
  save(): void {
    if (!this.manage || !this.loaded() || this.saving() || this.form.invalid) return;
    const value = this.form.getRawValue();
    if (!Number.isFinite(value.member_workload_hours) || !Number.isFinite(value.instructor_workload_hours)) return;
    this.saving.set(true); this.reportWorking(); this.error.set(''); this.success.set('');
    this.api.saveWorkload(this.clubId, value).pipe(takeUntilDestroyed(this.destroy), finalize(() => { this.saving.set(false); this.reportWorking(); })).subscribe({
      next: saved => { this.form.patchValue(saved); this.success.set('Carga horária atualizada.'); },
      error: error => this.error.set(apiErrorMessage(error, 'Não foi possível salvar a carga horária.')),
    });
  }
}
