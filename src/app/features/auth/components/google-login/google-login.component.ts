import { Component, ElementRef, ViewChild, afterNextRender, inject, input, output, signal, DestroyRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { apiErrorMessage } from '../../../../core/api/api-error';

interface GoogleIdentity {
  initialize(options: { client_id: string; callback: (response: { credential: string }) => void; auto_select: boolean }): void;
  renderButton(element: HTMLElement, options: Record<string, string>): void;
}
function identity(): GoogleIdentity | undefined {
  return (window as unknown as { google?: { accounts: { id: GoogleIdentity } } }).google?.accounts.id;
}
let sdk: Promise<GoogleIdentity> | undefined;
function loadGoogle(): Promise<GoogleIdentity> {
  if (identity()) return Promise.resolve(identity()!);
  if (sdk) return sdk;
  sdk = new Promise<GoogleIdentity>((resolve, reject) => {
    const script = document.createElement('script');
    const timer = setTimeout(() => fail(), 15000);
    const fail = () => { clearTimeout(timer); script.remove(); reject(new Error('Não foi possível carregar o Google. Tente novamente.')); };
    script.src = 'https://accounts.google.com/gsi/client'; script.async = true;
    script.onload = () => { clearTimeout(timer); identity() ? resolve(identity()!) : fail(); };
    script.onerror = fail;
    document.head.appendChild(script);
  }).catch(error => { sdk = undefined; throw error; });
  return sdk;
}

@Component({
  selector: 'app-google-login', standalone: true,
  template: `
    <div class="google-access" [attr.aria-busy]="loading() || busy()">
      <div #button [attr.inert]="disabled() || busy() ? '' : null" [hidden]="loading() || !!error()" aria-label="Entrar com Google"></div>
      @if (loading() || busy()) { <span role="status"><span class="spinner" aria-hidden="true"></span> {{ busy() ? 'Entrando…' : 'Carregando Google…' }}</span> }
      @if (error()) { <p role="alert">{{ error() }}</p><button type="button" (click)="initialize()" [disabled]="disabled()">Tentar novamente</button> }
    </div>
  `,
  styles: `:host { display:block; } .google-access { display:grid; justify-items:center; gap:.5rem; font-size:.85rem; }
    p { color:var(--error); margin:0; } span[role=status] { display:flex; align-items:center; gap:.5rem; }
    .spinner { width:1rem; height:1rem; border:2px solid var(--brand-border); border-top-color:var(--brand-600); border-radius:50%; animation:spin .8s linear infinite; }
    button { background:transparent; color:var(--brand-700); border:1px solid var(--brand-border); border-radius:.4rem; padding:.4rem .7rem; cursor:pointer; }
    @keyframes spin { to {transform:rotate(360deg)} } @media(prefers-reduced-motion:reduce) { .spinner {animation:none} }`,
})
export class GoogleLoginComponent {
  @ViewChild('button', { static: true }) button!: ElementRef<HTMLElement>;
  readonly disabled = input(false);
  readonly busyChange = output<boolean>();
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  constructor() { afterNextRender(() => void this.initialize()); }
  async initialize(): Promise<void> {
    if (this.loading() || this.busy()) return;
    this.error.set('');
    if (!environment.googleClientId) { this.error.set('O acesso com Google ainda não foi configurado. Use email e senha.'); return; }
    this.loading.set(true);
    try {
      const google = await loadGoogle();
      if (this.destroyRef.destroyed) return;
      google.initialize({ client_id: environment.googleClientId, auto_select: false, callback: response => this.authenticate(response.credential) });
      this.button.nativeElement.replaceChildren();
      google.renderButton(this.button.nativeElement, { type: 'icon', theme: 'outline', size: 'large', shape: 'circle', locale: 'pt-BR' });
    } catch { if (!this.destroyRef.destroyed) this.error.set('Não foi possível carregar o Google. Confira sua conexão e tente novamente.'); }
    finally { if (!this.destroyRef.destroyed) this.loading.set(false); }
  }
  authenticate(credential: string): void {
    if (this.destroyRef.destroyed || this.disabled() || this.busy() || !credential) return;
    this.busy.set(true); this.busyChange.emit(true); this.error.set('');
    this.auth.loginWithGoogle(credential).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => {
      this.busy.set(false); if (!this.destroyRef.destroyed) this.busyChange.emit(false);
    })).subscribe({
      next: () => {
        const url = this.route.snapshot.queryParamMap.get('returnUrl');
        void this.router.navigateByUrl(url?.startsWith('/') && !url.startsWith('//') && !url.includes('\\') ? url : '/');
      },
      error: error => this.error.set(apiErrorMessage(error, 'Não foi possível entrar com Google. Tente novamente ou use email e senha.')),
    });
  }
}
