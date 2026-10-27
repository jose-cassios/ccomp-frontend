import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EMPTY, Subject, catchError, finalize, map, merge, switchMap, tap } from 'rxjs';
import { CertificateValidation } from '../../models/certificate.model';
import { CertificatesService } from '../../services/certificates.service';

@Component({
  selector: 'app-certificate-validation',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe],
  template: `
    <main>
      <h1>Validar certificado</h1>
      <p>Confira a autenticidade pelo código informado no certificado. Não é necessário entrar na sua conta.</p>
      <form (ngSubmit)="submit()">
        <label for="certificate-code">Código de validação</label>
        <div class="search"><input id="certificate-code" [formControl]="code" maxlength="64" autocomplete="off" placeholder="Digite o código" /><button type="submit" [disabled]="loading()">{{ loading() ? 'Verificando…' : 'Verificar' }}</button></div>
      </form>
      @if (loading()) { <p role="status"><span class="spinner"></span> Consultando certificado…</p> }
      @if (error(); as message) { <p class="error" role="alert">{{ message }}</p> }
      @if (result(); as certificate) {
        <section aria-labelledby="validation-result" role="status">
          <h2 id="validation-result">Certificado válido</h2>
          <dl>
            <dt>Participante</dt><dd>{{ certificate.participant_name }}</dd>
            <dt>Evento</dt><dd>{{ certificate.event_title }}</dd>
            @if (certificate.activity_title) { <dt>Atividade</dt><dd>{{ certificate.activity_title }}</dd> }
            <dt>Carga horária</dt><dd>{{ certificate.workload_hours ?? 'Não informada' }}</dd>
            <dt>Emitido em</dt><dd>{{ certificate.issued_at | date: 'dd/MM/yyyy, HH:mm' }}</dd>
            <dt>Código</dt><dd>{{ certificate.code }}</dd>
          </dl>
        </section>
      }
    </main>
  `,
  styles: `
    main { max-width: 780px; padding: 2rem 1rem 4rem; margin: auto; }
    h1 { font-size: clamp(1.5rem, 3vw, 2rem); margin-bottom: .75rem; }
    h2 { font-size: 1.2rem; color: var(--brand-700); }
    p { color: var(--text-secondary); line-height: 1.6; margin: .75rem 0; }
    form, section { border: 1px solid var(--border-primary); padding: 1.5rem; border-radius: .75rem; margin-top: 1.5rem; background: var(--white); }
    label { display: block; margin-bottom: .5rem; font-weight: 600; }
    .search { display: flex; gap: .75rem; }
    input { min-width: 0; flex: 1; padding: .75rem; border: 1px solid var(--border-primary); border-radius: .5rem; font: inherit; }
    button { padding: .75rem 1rem; border: 0; border-radius: .5rem; background: var(--brand-600); color: var(--white); font: inherit; cursor: pointer; }
    button:disabled { opacity: .6; cursor: wait; }
    input:focus-visible, button:focus-visible { outline: 2px solid var(--brand-500); outline-offset: 2px; }
    dl { display: grid; grid-template-columns: auto 1fr; gap: .75rem 1.5rem; margin-top: 1rem; }
    dt { color: var(--text-secondary); } dd { margin: 0; overflow-wrap: anywhere; }
    .error { color: var(--error); } .spinner { display: inline-block; width: 1rem; height: 1rem; border: 2px solid var(--brand-border); border-top-color: var(--brand-600); border-radius: 50%; animation: spin .8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @media (max-width: 480px) { .search { flex-direction: column; } dl { grid-template-columns: 1fr; gap: .25rem; } dd { margin-bottom: .75rem; } }
    @media (prefers-reduced-motion: reduce) { .spinner { animation: none; } }
  `,
})
export class CertificateValidationComponent implements OnInit {
  private readonly api = inject(CertificatesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly code = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(64), Validators.pattern(/^[a-zA-Z0-9]+$/)] });
  readonly loading = signal(false);
  readonly result = signal<CertificateValidation | null>(null);
  readonly error = signal<string | null>(null);
  private readonly retry = new Subject<string>();

  ngOnInit(): void {
    merge(this.route.paramMap.pipe(map(params => params.get('code'))), this.retry).pipe(
      switchMap(code => {
        this.result.set(null); this.error.set(null);
        if (!code) return EMPTY;
        this.code.setValue(code.trim().toUpperCase());
        if (!this.valid()) return EMPTY;
        this.loading.set(true);
        return this.api.validate(this.code.value).pipe(
          tap(result => this.result.set(result)),
          catchError(error => {
            this.error.set(error instanceof HttpErrorResponse && error.status === 404
              ? 'Não encontramos um certificado com esse código. Confira o código digitado.'
              : 'Não foi possível consultar o certificado agora. Tente novamente.');
            return EMPTY;
          }),
          finalize(() => this.loading.set(false)),
        );
      }), takeUntilDestroyed(this.destroyRef),
    ).subscribe();
  }

  submit(): void {
    this.code.setValue(this.code.value.trim().toUpperCase());
    if (this.loading() || !this.valid()) return;
    if (this.route.snapshot.paramMap.get('code') === this.code.value) {
      this.retry.next(this.code.value);
    } else {
      void this.router.navigate(['/validar', this.code.value]);
    }
  }

  private valid(): boolean {
    if (this.code.valid) return true;
    this.result.set(null); this.error.set('Informe um código válido, com letras e números.'); return false;
  }
}
