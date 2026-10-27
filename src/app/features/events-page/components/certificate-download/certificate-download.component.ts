import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../auth/services/auth.service';
import { apiErrorMessage } from '../../../../core/api/api-error';
import { autoDismissFeedback } from '../../../../core/ui/feedback-auto-dismiss';
import { CertificateScope } from '../../models/certificate.model';
import { CertificatesService } from '../../services/certificates.service';

@Component({
  selector: 'app-certificate-download',
  standalone: true,
  template: `
    <button type="button" [disabled]="busy()" [attr.aria-busy]="busy()" (click)="download()">
      @if (busy()) { <span class="spinner" aria-hidden="true"></span> Gerando certificado… }
      @else { Baixar certificado }
    </button>
    @if (error(); as message) { <p role="alert" class="error">{{ message }}</p> }
    @if (success(); as message) { <p role="status">{{ message }}</p> }
  `,
  styles: `
    :host { display: block; }
    button { display: inline-flex; align-items: center; justify-content: center; gap: .5rem; padding: .65rem .85rem; border: 1px solid var(--brand-border); border-radius: .6rem; background: var(--brand-50); color: var(--brand-700); font: inherit; font-size: .85rem; font-weight: 600; cursor: pointer; }
    button:disabled { opacity: .65; cursor: wait; }
    button:focus-visible { outline: 2px solid var(--brand-500); outline-offset: 2px; }
    p { font-size: .8rem; margin-top: .5rem; max-width: 28rem; color: var(--text-secondary); }
    .error { color: var(--error); }
    .spinner { width: 1rem; height: 1rem; border: 2px solid var(--brand-border); border-top-color: var(--brand-600); border-radius: 50%; animation: spin .8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) { .spinner { animation: none; } }
  `,
})
export class CertificateDownloadComponent {
  readonly resourceId = input.required<number>();
  readonly scope = input<CertificateScope>('event');
  private readonly api = inject(CertificatesService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  private readonly feedback = autoDismissFeedback(this.error, this.success, () => {
    this.error.set(null); this.success.set(null);
  });
  private downloadUrl: string | null = null;
  constructor() {
    this.destroyRef.onDestroy(() => { if (this.downloadUrl) URL.revokeObjectURL(this.downloadUrl); });
  }

  download(): void {
    if (this.busy()) return;
    if (!this.auth.isAuthenticatedState()) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    this.busy.set(true); this.error.set(null); this.success.set(null);
    this.api.download(this.resourceId(), this.scope()).pipe(
      takeUntilDestroyed(this.destroyRef), finalize(() => this.busy.set(false)),
    ).subscribe({
      next: blob => {
        if (this.downloadUrl) URL.revokeObjectURL(this.downloadUrl);
        this.downloadUrl = URL.createObjectURL(blob);
        const link = this.document.createElement('a');
        link.href = this.downloadUrl;
        link.download = `certificado-${this.scope() === 'event' ? 'evento' : 'atividade'}-${this.resourceId()}.png`;
        this.document.body.appendChild(link); link.click(); link.remove();
        this.success.set('Certificado gerado. O download foi iniciado.');
      },
      error: error => this.error.set(apiErrorMessage(error,
        'Não foi possível emitir o certificado. É necessário estar inscrito e ter realizado o check-in. Tente novamente.')),
    });
  }
}
