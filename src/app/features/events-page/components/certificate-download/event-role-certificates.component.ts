import { Component, Input, OnChanges, DestroyRef, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivityInstructorsService, Instructor } from '../../services/activity-instructors.service';
import { AuthService } from '../../../auth/services/auth.service';
import { CertificateDownloadComponent } from './certificate-download.component';
import { apiErrorMessage } from '../../../../core/api/api-error';

@Component({
  selector: 'app-event-role-certificates', standalone: true, imports: [CertificateDownloadComponent],
  template: `
    @if (loading()) { <p role="status"><span class="mini-spinner"></span> Consultando certificados…</p> }
    @if (error()) { <p role="alert">{{ error() }}</p><button type="button" (click)="load()">Tentar novamente</button> }
    @if (recipients().length || teamMember) {
      <section aria-label="Certificados de ministrantes e equipe">
        <p>Disponíveis após o encerramento do evento. A carga horária do ministrante soma suas atividades confirmadas.</p>
        @for (person of recipients(); track person.id) {
          <article><strong>{{ manage ? person.name : 'Minha atuação como ministrante' }}</strong>
            @if (person.user_id) {
              <app-certificate-download [resourceId]="eventId" scope="instructor" [instructorId]="person.id" [asLink]="true" label="Solicitar certificado de ministrante" />
            } @else { <small>Vincule uma conta ativa na programação para habilitar o certificado.</small> }
          </article>
        }
        @if (teamMember) { <app-certificate-download [resourceId]="eventId" scope="team" [asLink]="true" label="Solicitar certificado da equipe" /> }
      </section>
    }
  `,
  styles: `:host{display:block;min-width:0}p,small{font-size:.82rem;color:var(--text-secondary)}article{margin:12px 0;overflow-wrap:anywhere}strong,small{display:block}button{font:inherit;color:var(--brand-700);cursor:pointer}`,
})
export class EventRoleCertificatesComponent implements OnChanges {
  @Input({ required: true }) eventId!: number;
  @Input() manage = false;
  @Input() teamMember = false;
  private readonly api = inject(ActivityInstructorsService);
  private readonly auth = inject(AuthService);
  private readonly destroy = inject(DestroyRef);
  readonly rows = signal<Instructor[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  // One event certificate per account, even when the person teaches several activities.
  readonly recipients = computed(() => {
    const userId = this.auth.currentUserState()?.id;
    const seen = new Set<string>();
    return this.rows().filter(row => {
      if (row.is_guest || row.status !== 'CONFIRMED' || (!this.manage && (!userId || row.user_id !== userId))) return false;
      const key = row.user_id || 'profile:' + row.id;
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });
  });
  ngOnChanges(): void { this.load(); }
  load(): void {
    if (this.loading()) return;
    this.loading.set(true); this.error.set(''); this.rows.set([]);
    this.api.forEvent(this.eventId).pipe(takeUntilDestroyed(this.destroy), finalize(() => this.loading.set(false))).subscribe({
      next: rows => this.rows.set(rows),
      error: e => {
        if (!this.manage && e instanceof HttpErrorResponse && [401,403].includes(e.status)) return;
        this.error.set(apiErrorMessage(e, 'Não foi possível consultar os certificados de ministrantes.'));
      },
    });
  }
}
