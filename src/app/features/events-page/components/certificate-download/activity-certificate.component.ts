import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, HostListener, Input, OnChanges, PLATFORM_ID, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, Subscription } from 'rxjs';
import { CertificatesService } from '../../services/certificates.service';
import { apiErrorMessage } from '../../../../core/api/api-error';

/** Mounted only for a finished activity with a confirmed active subscription.
 * The current API has no self-attendance/eligibility endpoint: a successful
 * certificate response is the authoritative confirmation. Keep the returned
 * file in memory so clicking the link does not generate it a second time.
 */
@Component({
  selector: 'app-activity-certificate', standalone: true,
  template: `
    @if (loading()) { <small role="status"><span class="mini-spinner" aria-hidden="true"></span> Verificando certificado…</small> }
    @if (url(); as href) {
      <a [href]="href" [download]="'certificado-atividade-' + activityId + '.png'">Solicitar certificado</a>
    } @else if (!loading()) {
      @if (error()) { <small role="alert">{{ error() }}</small> }
      @else { <small>O certificado depende da confirmação da inscrição e da presença.</small> }
      <button type="button" (click)="verify()">Atualizar situação do certificado</button>
    }
  `,
  styles: `:host{display:grid;gap:.5rem;min-width:0}a{color:var(--brand-700);font-weight:600;text-decoration:underline;text-underline-offset:.2em}small{font-size:.8rem;color:var(--text-secondary);overflow-wrap:anywhere}button{background:transparent;color:var(--brand-700);border:1px solid var(--border-primary);border-radius:.5rem;font:inherit;font-size:.8rem;padding:.5rem;cursor:pointer}[role=alert]{color:var(--error)}:focus-visible{outline:2px solid var(--brand-500);outline-offset:2px}`,
})
export class ActivityCertificateComponent implements OnChanges {
  @Input({ required: true }) activityId!: number;
  @Input({ required: true }) userId!: string;
  @Input() revision = 0;
  private readonly api = inject(CertificatesService);
  private readonly platform = inject(PLATFORM_ID);
  private readonly destroy = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private request?: Subscription;
  private lastAttempt = 0;
  readonly loading = signal(false);
  readonly url = signal<string | null>(null);
  readonly error = signal('');
  constructor() { this.destroy.onDestroy(() => this.clear()); }
  ngOnChanges(): void { this.request?.unsubscribe(); this.clear(); this.verify(); }
  @HostListener('window:focus') onFocus(): void {
    if (!this.url() && this.document.visibilityState !== 'hidden' && Date.now() - this.lastAttempt > 30000) this.verify();
  }
  verify(): void {
    if (!isPlatformBrowser(this.platform) || this.loading() || !this.userId || !Number.isSafeInteger(this.activityId) || this.activityId <= 0) return;
    this.lastAttempt = Date.now(); this.loading.set(true); this.error.set(''); this.clear();
    this.request = this.api.download(this.activityId, 'activity').pipe(takeUntilDestroyed(this.destroy), finalize(() => this.loading.set(false))).subscribe({
      next: blob => this.url.set(URL.createObjectURL(blob)),
      error: error => {
        // These responses mean enrollment/check-in is not yet confirmed or access was revoked.
        if (error instanceof HttpErrorResponse && [400, 401, 403, 404].includes(error.status)) return;
        this.error.set(apiErrorMessage(error, 'Não foi possível consultar o certificado. Tente novamente.'));
      },
    });
  }
  private clear(): void { const url = this.url(); if (url) URL.revokeObjectURL(url); this.url.set(null); }
}
