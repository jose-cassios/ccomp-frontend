import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { AuthService } from '../../../auth/services/auth.service';
import { ADMINISTRATION_ROLES } from '../../../auth/config/auth.config';
import { AdminInfraLogsService } from '../../services/admin-infra-logs.service';
import { INFRA_LEVELS, INFRA_SERVICES, InfraLogFilter, InfraLogsResponse } from '../../models/admin-infra-log.model';

@Component({
  selector: 'app-admin-infra-logs', standalone: true,
  imports: [DatePipe, ReactiveFormsModule],
  templateUrl: './admin-infra-logs.component.html',
  styleUrl: './admin-infra-logs.component.css',
})
export class AdminInfraLogsComponent implements OnInit {
  private readonly service = inject(AdminInfraLogsService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  readonly services = INFRA_SERVICES;
  readonly levels = INFRA_LEVELS;
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly result = signal<InfraLogsResponse | null>(null);
  readonly form = this.fb.nonNullable.group({
    serviceName: this.fb.nonNullable.control<NonNullable<InfraLogFilter['serviceName']> | ''>(''),
    container: ['', [Validators.maxLength(128), Validators.pattern(/^[a-zA-Z0-9_.-]*$/)]],
    level: this.fb.nonNullable.control<NonNullable<InfraLogFilter['level']> | ''>(''),
    search: ['', Validators.maxLength(256)],
    start: [''], end: [''],
    limit: [100, [Validators.required, Validators.min(1), Validators.max(500), Validators.pattern(/^\d+$/)]],
  });

  ngOnInit(): void { this.reload(); }

  reload(): void {
    if (this.loading()) return;
    if (!this.auth.hasAnyRole(ADMINISTRATION_ROLES)) {
      this.result.set(null);
      this.error.set('A consulta de logs está disponível somente para administradores.');
      return;
    }
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Revise os filtros: container com até 128 letras, números, pontos, hífens ou sublinhados; busca com até 256 caracteres; limite inteiro de 1 a 500.');
      return;
    }
    const value = this.form.getRawValue();
    const end = value.end ? new Date(value.end) : new Date();
    const start = value.start ? new Date(value.start) : new Date(end.getTime() - 3_600_000);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start > end || end.getTime() - start.getTime() > 7 * 86_400_000) {
      this.error.set('Informe datas válidas, com início anterior ou igual ao fim e intervalo máximo de 7 dias.');
      return;
    }
    const filter: InfraLogFilter = { start: start.toISOString(), end: end.toISOString(), limit: value.limit };
    if (value.serviceName) filter.serviceName = value.serviceName;
    if (value.level) filter.level = value.level;
    if (value.container) filter.container = value.container;
    if (value.search.trim()) filter.search = value.search;
    this.result.set(null);
    this.loading.set(true);
    this.service.search(filter).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: result => this.result.set(result),
      error: (error: unknown) => this.error.set(
        error instanceof HttpErrorResponse && error.status === 403
          ? 'Você não tem permissão para consultar os logs. Acesso exclusivo de administradores.'
          : 'Não foi possível consultar os logs. Tente novamente; se persistir, verifique a disponibilidade do serviço de logs.',
      ),
    });
  }

  clear(): void { this.form.reset(); this.reload(); }
}
