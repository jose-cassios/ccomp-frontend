import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, expand, finalize, forkJoin, reduce, throwError } from 'rxjs';
import { EventActivity, EventDetails, EventEditor } from '../../models/event.model';
import { CertificateBox, ManualCertificateContent } from '../../models/certificate.model';
import { CertificatesService } from '../../services/certificates.service';
import { EventsService } from '../../services/events.service';
import { ActivityInstructorsService, Instructor } from '../../services/activity-instructors.service';
import { EventGuestsService, EventGuest } from '../../services/event-guests.service';
import { apiErrorMessage } from '../../../../core/api/api-error';
import { autoDismissFeedback } from '../../../../core/ui/feedback-auto-dismiss';

@Component({
  selector: 'app-certificate-manual-management', standalone: true, imports: [FormsModule],
  templateUrl: './certificate-manual-management.component.html',
  styleUrl: './certificate-manual-management.component.css',
})
export class CertificateManualManagementComponent implements OnInit {
  @Input({ required: true }) event!: EventDetails;
  @Input() boxes: CertificateBox[] = [];
  @Input() allowed = false;
  @Input() allowCustom = true;
  @Output() working = new EventEmitter<boolean>();
  private readonly api = inject(CertificatesService);
  private readonly events = inject(EventsService);
  private readonly instructorsApi = inject(ActivityInstructorsService);
  private readonly guestsApi = inject(EventGuestsService);
  private readonly destroy = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  readonly busy = signal(false);
  readonly loaded = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly instructors = signal<Instructor[]>([]);
  readonly activities = signal<EventActivity[]>([]);
  readonly editors = signal<EventEditor[]>([]);
  readonly guests = signal<EventGuest[]>([]);
  readonly previewUrl = signal<string | null>(null);
  readonly resultUrl = signal<string | null>(null);
  kind: 'instructor' | 'guest' | 'team' | 'custom' = 'instructor';
  recipient = '';
  activity = '';
  level: 'event' | 'activity' = 'event';
  values: Record<string, string> = {};
  private readonly feedback = autoDismissFeedback(this.error, this.success, () => { this.error.set(''); this.success.set(''); });

  constructor() {
    this.destroy.onDestroy(() => { this.clearImages(); this.working.emit(false); });
  }
  ngOnInit(): void { this.load(); }
  get finalized(): boolean { return this.event.execution_status === 'FINISHED' && this.event.status !== 'CANCELED'; }
  get tokens(): string[] {
    return [...new Set(this.boxes.flatMap(box => box.text_template.match(/\{[^{}]+\}/g) ?? []))]
      .filter(token => !token.startsWith('{validacao.'));
  }
  get selectedInstructor(): Instructor | undefined { return this.instructors().find(row => String(row.id) === this.recipient); }
  activityName(id: number): string { return this.activities().find(row => row.id === id)?.title || 'Atividade'; }
  tokenLabel(token: string): string { return token.slice(1, -1).replaceAll('.', ' · ').replaceAll('_', ' '); }

  load(): void {
    if (!this.allowed || this.busy()) return;
    const cursors = new Set<string>();
    const editors = this.events.getEditors(this.event.id).pipe(expand(page => {
      if (!page.next_cursor) return EMPTY;
      if (cursors.has(page.next_cursor)) return throwError(() => new Error('A API repetiu a lista de editores.'));
      cursors.add(page.next_cursor); return this.events.getEditors(this.event.id, page.next_cursor);
    }), reduce((rows, page) => [...rows, ...page.content], [] as EventEditor[]));
    this.run(forkJoin({ instructors: this.instructorsApi.forEvent(this.event.id), activities: this.events.getAllActivities(this.event.id), editors }), result => {
      this.instructors.set(result.instructors.filter(row => !row.is_guest && row.status === 'CONFIRMED'));
      this.activities.set(result.activities); this.editors.set(result.editors.filter(row => row.active && row.user_id !== this.event.owner_id));
      this.loaded.set(true);
    });
  }
  changeKind(): void {
    this.recipient = ''; this.activity = ''; this.guests.set([]); this.clearImages(); this.error.set(''); this.success.set('');
    this.values = { '{evento.title}': this.event.title, '{evento.organizacao}': this.event.organization ?? '', '{evento.local}': this.event.address ?? '' };
  }
  loadGuests(): void {
    this.recipient = ''; this.guests.set([]); this.clearImages();
    const id = Number(this.activity);
    if (!this.activities().some(row => row.id === id)) return;
    this.run(this.guestsApi.allGuests(this.event.id, id), rows => this.guests.set(rows.filter(row => row.status === 'CONFIRMED' && row.role === 'PRESENTER')));
  }
  issue(automatic = false): void {
    if (!this.allowed || this.busy() || !this.loaded()) return;
    if (!this.finalized) { this.error.set('A emissão exige evento encerrado e não cancelado.'); return; }
    this.clearImages();
    if (this.kind === 'custom') { this.custom(false); return; }
    let request: Observable<Blob>;
    if (this.kind === 'team') {
      if (!this.recipient || (this.recipient !== this.event.owner_id && !this.editors().some(row => row.user_id === this.recipient))) return;
      if (this.event.team_certificate_workload_hours == null) { this.error.set('Configure a carga horária da equipe antes de emitir.'); return; }
      request = this.api.manualTeam(this.event.id, this.recipient);
    } else if (this.kind === 'instructor') {
      const person = this.selectedInstructor;
      if (!person) return;
      if (automatic && !person.user_id) { this.error.set('Para emitir com validação, vincule uma conta ao ministrante. A emissão manual está disponível sem conta.'); return; }
      request = automatic
        ? this.level === 'activity' ? this.api.instructorActivityCertificate(this.event.id, person.activity_id, person.id) : this.api.download(this.event.id, 'instructor', person.id)
        : this.api.manualInstructor(this.event.id, { instructor_id: person.id, ...(this.level === 'activity' ? { activity_id: person.activity_id } : {}) });
    } else {
      const person = this.guests().find(row => String(row.id) === this.recipient);
      if (!person || (!automatic && this.level !== 'activity')) return;
      request = automatic ? this.api.guestCertificate(this.event.id, Number(this.activity), person.id, this.level === 'activity')
        : this.api.manualInstructor(this.event.id, { activity_id: Number(this.activity), activity_guest_id: person.id });
    }
    if (!window.confirm('Emitir o certificado para a pessoa selecionada?')) return;
    this.run(request, blob => this.download(blob));
  }
  custom(preview: boolean): void {
    if (!this.allowed || this.busy() || !this.allowCustom) return;
    if (!preview && !this.finalized) { this.error.set('A emissão avulsa definitiva exige evento encerrado e não cancelado.'); return; }
    const boxes = this.boxes.map(box => ({ ...box, text_template: box.text_template.replace(/\{validacao\.[^{}]+\}/g, '') })).filter(box => box.text_template.trim());
    if (!boxes.length || boxes.length > 30 || this.tokens.length > 50 || this.tokens.some(token => !this.values[token]?.trim() || token.length > 100 || this.values[token].length > 2000)) {
      this.error.set('Preencha todas as informações do certificado e revise o conteúdo no estúdio.'); return;
    }
    const content: ManualCertificateContent = { boxes, variables: Object.fromEntries(this.tokens.map(token => [token, this.values[token].trim()])) };
    if (!preview && !window.confirm('Emitir este certificado avulso? Ele não terá código de validação nem ficará salvo na plataforma.')) return;
    this.clearImages();
    this.run(this.api.manualContent(this.event.id, content, preview), blob => {
      if (preview) this.previewUrl.set(URL.createObjectURL(blob)); else this.download(blob);
    });
  }
  clearImages(): void {
    for (const state of [this.previewUrl, this.resultUrl]) { if (state()) URL.revokeObjectURL(state()!); state.set(null); }
  }
  private download(blob: Blob): void {
    const url = URL.createObjectURL(blob); this.resultUrl.set(url);
    const link = this.document.createElement('a'); link.href = url; link.download = 'certificado-' + this.event.id + '.png';
    this.document.body.appendChild(link); link.click(); link.remove();
    this.success.set('Certificado gerado. O download foi iniciado.');
  }
  private run<T>(request: Observable<T>, next: (value: T) => void): void {
    if (!this.allowed || this.busy()) return;
    this.busy.set(true); this.working.emit(true); this.error.set(''); this.success.set('');
    request.pipe(takeUntilDestroyed(this.destroy), finalize(() => { this.busy.set(false); this.working.emit(false); })).subscribe({ next,
      error: error => this.error.set(apiErrorMessage(error, 'Não foi possível concluir. Verifique os dados e tente novamente.')) });
  }
}
