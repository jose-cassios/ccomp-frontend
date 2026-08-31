import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, HostListener, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, Observable } from 'rxjs';
import { ADMINISTRATION_ROLES } from '../../../auth/config/auth.config';
import { AuthService } from '../../../auth/services/auth.service';
import {
  ActivityPayload,
  CreateEventPayload,
  EVENT_CATEGORY_OPTIONS,
  EVENT_FORMAT_OPTIONS,
  EventActivity,
  EventCategory,
  EventDetails,
  EventEditor,
  EventFormat,
  UpdateEventPayload,
} from '../../models/event.model';
import { EventsService } from '../../services/events.service';

type EditorOperation = 'idle' | 'loading' | 'saving' | 'deleting' | 'activity' | 'editor';
type EventEditorStep = 'details' | 'presentation' | 'schedule' | 'team' | 'review';

const EDITOR_STEPS: ReadonlyArray<{ value: EventEditorStep; label: string }> = [
  { value: 'details', label: 'Informações' },
  { value: 'presentation', label: 'Página do evento' },
  { value: 'schedule', label: 'Programação' },
  { value: 'team', label: 'Equipe' },
  { value: 'review', label: 'Revisão' },
];

@Component({
  selector: 'app-event-editor',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './event-editor.component.html',
  styleUrl: './event-editor.component.css',
})
export class EventEditorComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly eventsService = inject(EventsService);
  private readonly authService = inject(AuthService);

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(255)]],
    category: this.fb.nonNullable.control<EventCategory>('ACADEMIC_EDUCATIONAL', Validators.required),
    format: this.fb.nonNullable.control<EventFormat>('IN_PERSON', Validators.required),
    start_date: ['', Validators.required],
    end_date: ['', Validators.required],
    collaborator_email: ['', Validators.email],
  });
  readonly presentationForm = this.fb.nonNullable.group({
    summary: ['', [Validators.minLength(4), Validators.maxLength(255)]],
    content: ['', [Validators.minLength(4), Validators.maxLength(5000)]],
    cover_image_url: ['', Validators.pattern(/^https?:\/\/.+/)],
  });
  readonly activityForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(255)]],
    description: ['', Validators.maxLength(2000)],
  });
  readonly editorForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  readonly event = signal<EventDetails | null>(null);
  readonly editingExisting = signal(false);
  readonly activeStep = signal<EventEditorStep>('details');
  readonly activities = signal<EventActivity[]>([]);
  readonly editors = signal<EventEditor[]>([]);
  readonly ownedEventIds = signal<ReadonlySet<number>>(new Set());
  readonly operation = signal<EditorOperation>('idle');
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly hasUnsavedChanges = signal(false);
  readonly categories = EVENT_CATEGORY_OPTIONS;
  readonly formats = EVENT_FORMAT_OPTIONS;
  readonly steps = EDITOR_STEPS;
  readonly isBusy = computed(() => this.operation() !== 'idle');
  readonly isAdmin = computed(() => this.authService.hasAnyRole(ADMINISTRATION_ROLES));
  readonly isOwner = computed(() => {
    const eventId = this.event()?.id;
    return eventId !== undefined && this.ownedEventIds().has(eventId);
  });
  readonly canDelete = computed(() => this.isAdmin() || this.isOwner());
  readonly canManageTeam = computed(() => this.isOwner());
  readonly operationLabel = computed(() => {
    switch (this.operation()) {
      case 'loading': return 'Carregando evento...';
      case 'saving': return 'Salvando informações do evento...';
      case 'deleting': return 'Excluindo evento...';
      case 'activity': return 'Atualizando programação...';
      case 'editor': return 'Atualizando equipe...';
      default: return '';
    }
  });

  constructor() {
    const registerChanges = () => {
      this.hasUnsavedChanges.set(true);
      this.successMessage.set(null);
    };
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(registerChanges);
    this.presentationForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(registerChanges);
  }

  ngOnInit(): void {
    this.loadOwnedEvents();
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.editingExisting.set(true);
    if (!/^\d+$/.test(id)) {
      this.errorMessage.set('O identificador do evento é inválido.');
      return;
    }
    this.loadEvent(id);
  }

  save(): void {
    if (this.isBusy()) return;
    if (this.form.invalid || !this.hasValidDates()) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Revise os campos obrigatórios e o período do evento.');
      return;
    }

    const value = this.form.getRawValue();
    const collaboratorEmail = value.collaborator_email.trim();
    const currentEvent = this.event();
    if (this.editingExisting() && !currentEvent) return;

    this.operation.set('saving');
    this.errorMessage.set(null);
    this.successMessage.set(null);
    const request: Observable<EventDetails> = currentEvent
      ? this.eventsService.update(currentEvent.id, this.buildBasicUpdatePayload())
      : this.eventsService.create({
          title: value.title,
          category: value.category,
          format: value.format,
          start_date: value.start_date,
          end_date: value.end_date,
        } satisfies CreateEventPayload);

    request.pipe(finalize(() => this.operation.set('idle'))).subscribe({
      next: (savedEvent) => {
        this.applyEvent(savedEvent, this.presentationForm.getRawValue());

        if (!currentEvent) {
          this.editingExisting.set(true);
          this.ownedEventIds.update((ids) => new Set(ids).add(savedEvent.id));
          this.location.replaceState(`/eventos/${savedEvent.id}/editar`);
          this.activeStep.set('presentation');
          this.successMessage.set('Evento criado. Complete a página do evento antes de montar a programação.');
          this.addInitialCollaborator(savedEvent.id, collaboratorEmail);
          return;
        }

        this.successMessage.set('Informações do evento salvas com sucesso.');
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.getErrorMessage(error, 'Não foi possível salvar o evento.'));
      },
    });
  }

  savePresentation(): void {
    const currentEvent = this.event();
    if (!currentEvent || this.isBusy()) return;
    if (this.form.invalid || this.presentationForm.invalid || !this.hasValidDates()) {
      this.form.markAllAsTouched();
      this.presentationForm.markAllAsTouched();
      this.errorMessage.set('Revise os dados da página do evento antes de salvar.');
      return;
    }

    this.operation.set('saving');
    this.errorMessage.set(null);
    this.successMessage.set(null);
    const presentation = this.presentationForm.getRawValue();
    this.eventsService.update(currentEvent.id, this.buildCompleteUpdatePayload()).pipe(
      finalize(() => this.operation.set('idle')),
    ).subscribe({
      next: (savedEvent) => {
        this.applyEvent(savedEvent, presentation);
        this.successMessage.set('Página do evento atualizada com sucesso.');
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.getErrorMessage(error, 'Não foi possível atualizar a página do evento.'));
      },
    });
  }

  selectStep(step: EventEditorStep): void {
    if (step === 'details') {
      this.activeStep.set(step);
      return;
    }

    if (!this.event()) {
      this.errorMessage.set('Salve as informações básicas antes de configurar as próximas etapas.');
      return;
    }

    if (step === 'team' && !this.canManageTeam()) {
      this.errorMessage.set('Apenas o responsável pelo evento pode gerenciar a equipe.');
      return;
    }

    this.activeStep.set(step);
  }

  deleteEvent(): void {
    const currentEvent = this.event();
    if (!currentEvent || !this.canDelete() || this.isBusy()) return;
    if (typeof window !== 'undefined' && !window.confirm(`Excluir o evento “${currentEvent.title}”?`)) return;

    this.operation.set('deleting');
    this.errorMessage.set(null);
    this.eventsService.deleteEvent(currentEvent.id).pipe(
      finalize(() => this.operation.set('idle')),
    ).subscribe({
      next: () => {
        this.hasUnsavedChanges.set(false);
        void this.router.navigate(['/eventos']);
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.getErrorMessage(error, 'Não foi possível excluir o evento.'));
      },
    });
  }

  saveActivity(): void {
    const currentEvent = this.event();
    if (!currentEvent || this.activityForm.invalid || this.isBusy()) {
      this.activityForm.markAllAsTouched();
      return;
    }

    const payload: ActivityPayload = this.activityForm.getRawValue();
    this.operation.set('activity');
    this.errorMessage.set(null);
    this.eventsService.createActivity(currentEvent.id, payload).pipe(
      finalize(() => this.operation.set('idle')),
    ).subscribe({
      next: (activity) => {
        this.activities.update((activities) => [...activities, activity]);
        this.activityForm.reset({ title: '', description: '' });
        this.loadActivities(currentEvent.id);
        this.successMessage.set('Atividade adicionada à programação.');
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.getErrorMessage(error, 'Não foi possível adicionar a atividade.'));
      },
    });
  }

  deleteActivity(activity: EventActivity): void {
    if (this.isBusy()) return;
    if (typeof window !== 'undefined' && !window.confirm(`Excluir a atividade “${activity.title}”?`)) return;

    this.operation.set('activity');
    this.eventsService.deleteActivity(activity.id).pipe(
      finalize(() => this.operation.set('idle')),
    ).subscribe({
      next: () => {
        this.activities.update((activities) => activities.filter((item) => item.id !== activity.id));
        this.successMessage.set('Atividade removida da programação.');
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.getErrorMessage(error, 'Não foi possível excluir a atividade.'));
      },
    });
  }

  addEditor(): void {
    const currentEvent = this.event();
    if (!currentEvent || !this.canManageTeam() || this.editorForm.invalid || this.isBusy()) {
      this.editorForm.markAllAsTouched();
      return;
    }

    const email = this.editorForm.controls.email.value.trim();
    this.operation.set('editor');
    this.errorMessage.set(null);
    this.eventsService.addEditor(currentEvent.id, email).pipe(
      finalize(() => this.operation.set('idle')),
    ).subscribe({
      next: (response) => {
        this.editorForm.reset({ email: '' });
        this.loadEditors(currentEvent.id);
        this.successMessage.set(response.response ?? response.message ?? 'Editor adicionado à equipe.');
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.getErrorMessage(error, 'Não foi possível adicionar o editor.'));
      },
    });
  }

  removeEditor(editor: EventEditor): void {
    const currentEvent = this.event();
    if (!currentEvent || !this.canManageTeam() || this.isBusy()) return;

    this.operation.set('editor');
    this.eventsService.removeEditor(currentEvent.id, editor.email_address).pipe(
      finalize(() => this.operation.set('idle')),
    ).subscribe({
      next: (response) => {
        this.editors.update((editors) => editors.filter((item) => item.id !== editor.id));
        this.successMessage.set(response.response ?? response.message ?? 'Editor removido da equipe.');
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.getErrorMessage(error, 'Não foi possível remover o editor.'));
      },
    });
  }

  dismissFeedback(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  canDeactivate(): boolean {
    if (!this.hasUnsavedChanges() || typeof window === 'undefined') return true;
    return window.confirm('Há alterações não salvas. Deseja sair mesmo assim?');
  }

  @HostListener('window:beforeunload', ['$event'])
  preventUnsavedUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) event.preventDefault();
  }

  private loadEvent(id: string): void {
    this.operation.set('loading');
    this.eventsService.getById(id).pipe(
      finalize(() => this.operation.set('idle')),
    ).subscribe({
      next: (event) => {
        this.applyEvent(event);
        this.loadActivities(event.id);
        this.loadEditors(event.id);
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.getErrorMessage(error, 'Não foi possível carregar o evento.'));
      },
    });
  }

  private loadOwnedEvents(): void {
    this.eventsService.getCreatedEvents().subscribe({
      next: (events) => this.ownedEventIds.set(new Set(events.map((event) => event.id))),
      error: () => undefined,
    });
  }

  private loadEditors(eventId: number): void {
    this.eventsService.getEditors(eventId).subscribe({
      next: (page) => this.editors.set(page.content.filter((editor) => editor.active)),
      error: () => this.editors.set([]),
    });
  }

  private loadActivities(eventId: number): void {
    this.eventsService.getActivities(eventId).subscribe({
      next: (page) => this.activities.set(page.content),
      // A atividade recém-criada continua visível caso a listagem falhe pontualmente.
      error: () => undefined,
    });
  }

  private addInitialCollaborator(eventId: number, email: string): void {
    if (!email) return;

    this.eventsService.addEditor(eventId, email).subscribe({
      next: (response) => {
        this.loadEditors(eventId);
        this.successMessage.set(
          response.response ?? response.message ?? 'Colaborador adicionado à equipe do evento.',
        );
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.getErrorMessage(
          error,
          'O evento foi criado, mas não foi possível adicionar o colaborador informado.',
        ));
      },
    });
  }

  private buildBasicUpdatePayload(): UpdateEventPayload {
    const value = this.form.getRawValue();
    return {
      title: value.title,
      category: value.category,
      format: value.format,
      start_date: value.start_date,
      end_date: value.end_date,
    };
  }

  private buildCompleteUpdatePayload(): UpdateEventPayload {
    const presentation = this.presentationForm.getRawValue();
    return {
      ...this.buildBasicUpdatePayload(),
      ...(presentation.summary.trim() ? { summary: presentation.summary.trim() } : {}),
      ...(presentation.content.trim() ? { content: presentation.content.trim() } : {}),
      ...(presentation.cover_image_url.trim() ? { cover_image_url: presentation.cover_image_url.trim() } : {}),
    };
  }

  private applyEvent(
    event: EventDetails,
    presentation?: { summary: string; content: string; cover_image_url: string },
  ): void {
    const enrichedEvent: EventDetails = {
      ...event,
      summary: event.summary ?? presentation?.summary ?? null,
      content: event.content ?? presentation?.content ?? null,
      cover_image_url: event.cover_image_url ?? presentation?.cover_image_url ?? null,
      description: event.content ?? presentation?.content ?? event.description ?? event.summary ?? presentation?.summary ?? null,
      activities: event.activities ?? [],
    };
    this.event.set(enrichedEvent);
    this.activities.set(enrichedEvent.activities ?? []);
    this.form.reset({
      title: enrichedEvent.title ?? '',
      category: enrichedEvent.category ?? 'ACADEMIC_EDUCATIONAL',
      format: enrichedEvent.format ?? 'IN_PERSON',
      start_date: this.toLocalInput(enrichedEvent.start_date),
      end_date: this.toLocalInput(enrichedEvent.end_date),
      collaborator_email: '',
    }, { emitEvent: false });
    this.presentationForm.reset({
      summary: enrichedEvent.summary ?? '',
      content: enrichedEvent.content ?? '',
      cover_image_url: enrichedEvent.cover_image_url ?? '',
    }, { emitEvent: false });
    this.hasUnsavedChanges.set(false);
  }

  private hasValidDates(): boolean {
    const start = this.form.controls.start_date.value;
    const end = this.form.controls.end_date.value;
    return Boolean(start && end && new Date(start).getTime() <= new Date(end).getTime());
  }

  private toLocalInput(value: string | null): string {
    return value ? value.slice(0, 16) : '';
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const message = error.error?.message ?? error.error?.response;
      if (typeof message === 'string' && message.trim()) return message;
      if (error.status === 403) return 'Você não tem permissão para realizar esta operação.';
      if (error.status === 404) return 'O recurso solicitado não foi encontrado.';
    }
    return fallback;
  }
}
