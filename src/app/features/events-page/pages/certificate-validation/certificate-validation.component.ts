import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EMPTY, Observable, Subject, catchError, combineLatest, distinctUntilChanged, finalize, forkJoin, map, merge, of, switchMap, tap } from 'rxjs';
import { ClubCertificatesService } from '../../../clubes/services/club-certificates.service';
import { CertificateValidation } from '../../models/certificate.model';
import { CertificatesService } from '../../services/certificates.service';

type PublicCertificate = Omit<CertificateValidation, 'certificate_type'> & { origin: 'event' | 'club'; type_label: string };

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
      @if (matches().length > 1 && !result()) {
        <p>Esse código identifica mais de um certificado. Selecione o que deseja conferir:</p>
        @for (item of matches(); track item.origin) { <button type="button" (click)="result.set(item)">{{ item.origin === 'club' ? 'Clube' : 'Evento' }}: {{ item.event_title }} · {{ item.participant_name }}</button> }
      }
      @if (result(); as certificate) {
        <section aria-labelledby="validation-result" role="status">
          <h2 id="validation-result">Certificado válido</h2>
          <dl>
            <dt>Titular</dt><dd>{{ certificate.participant_name }}</dd>
            @if (certificate.type_label) { <dt>Tipo</dt><dd>{{ certificate.type_label }}</dd> }
            <dt>{{ certificate.origin === 'club' ? 'Clube' : 'Evento' }}</dt><dd>{{ certificate.event_title }}</dd>
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
  private readonly clubs = inject(ClubCertificatesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly certificateTypes = { EVENT: 'Participação no evento', ACTIVITY: 'Participação em atividade', GUEST: 'Convidado', INSTRUCTOR: 'Ministrante ou auxiliar', EDITOR: 'Equipe do evento' };
  readonly code = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(64), Validators.pattern(/^[a-zA-Z0-9]+$/)] });
  readonly loading = signal(false);
  readonly result = signal<PublicCertificate | null>(null);
  readonly matches = signal<PublicCertificate[]>([]);
  readonly error = signal<string | null>(null);
  private readonly retry = new Subject<string>();

  ngOnInit(): void {
    merge(combineLatest([this.route.paramMap, this.route.queryParamMap]).pipe(map(([params, query]) => params.get('code') || query.get('code')), distinctUntilChanged()), this.retry).pipe(
      switchMap(code => {
        this.result.set(null); this.matches.set([]); this.error.set(null);
        if (!code) return EMPTY;
        this.code.setValue(code.trim().toUpperCase());
        if (!this.valid()) return EMPTY;
        this.loading.set(true);
        return forkJoin([
          this.lookup(this.api.validate(this.code.value).pipe(map(value => ({ ...value, origin: 'event' as const, type_label: value.certificate_type ? this.certificateTypes[value.certificate_type] : '' })))),
          this.lookup(this.clubs.validate(this.code.value).pipe(map(value => ({ code: value.code, participant_id: value.recipient_id,
            participant_name: value.recipient_name, event_title: value.club_name, activity_title: null, workload_hours: value.workload_hours + ' horas',
            issued_at: value.issued_at, origin: 'club' as const, type_label: value.certificate_type === 'MEMBER' ? 'Membro do clube' : 'Instrutor do clube' })))),
        ]).pipe(
          tap(outcomes => {
            const certificates = outcomes.map(item => item.certificate).filter((item): item is PublicCertificate => item !== null);
            this.matches.set(certificates);
            if (certificates.length === 1) this.result.set(certificates[0]);
            else if (!certificates.length) this.error.set(outcomes.every(item => item.notFound)
              ? 'Não encontramos um certificado com esse código. Confira o código digitado.'
              : 'Não foi possível consultar o certificado agora. Tente novamente.');
          }),
          finalize(() => this.loading.set(false)),
        );
      }), takeUntilDestroyed(this.destroyRef),
    ).subscribe();
  }

  private lookup(request: Observable<PublicCertificate>) {
    return request.pipe(map(certificate => ({ certificate: certificate as PublicCertificate | null, notFound: false })),
      catchError(error => of({ certificate: null, notFound: error instanceof HttpErrorResponse && error.status === 404 })));
  }

  submit(): void {
    this.code.setValue(this.code.value.trim().toUpperCase());
    if (this.loading() || !this.valid()) return;
    if ((this.route.snapshot.paramMap.get('code') || this.route.snapshot.queryParamMap.get('code')) === this.code.value) {
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
