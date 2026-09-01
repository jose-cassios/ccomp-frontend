import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, HostListener, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, Observable, of, switchMap } from 'rxjs';
import { ADMINISTRATION_ROLES, CONTENT_MANAGEMENT_ROLES } from '../../../auth/config/auth.config';
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
  EventEnrollment,
  EventFormat,
  UpdateEventPayload,
  eventExecutionStatusLabel,
  eventEnrollmentStateLabel,
  eventPublicationStatusLabel,
} from '../../models/event.model';
import { EventsService } from '../../services/events.service';

type EditorOperation = 'idle' | 'loading' | 'saving' | 'publishing' | 'deleting' | 'activity' | 'editor';
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
    enrollment_start_date: [''],
    enrollment_end_date: [''],
    enrollment_paused: false,
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
  readonly creationFlow = signal(true);
  readonly creationCompleted = signal(false);
  readonly activeStep = signal<EventEditorStep>('details');
  readonly lastUnlockedStep = signal(0);
  readonly activities = signal<EventActivity[]>([]);
  readonly editingActivityId = signal<number | null>(null);
  readonly editors = signal<EventEditor[]>([]);
  readonly enrollments = signal<EventEnrollment[]>([]);
  readonly enrollmentsNextCursor = signal<string | null>(null);
  readonly enrollmentsLoading = signal(false);
  readonly enrollmentsError = signal<string | null>(null);
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
    const currentEvent = this.event();
    const currentUserId = this.authService.currentUserState()?.id;
    return (currentEvent !== null && this.ownedEventIds().has(currentEvent.id))
      || Boolean(currentEvent?.owner_id && currentUserId && currentEvent.owner_id === currentUserId);
  });
  readonly isAssignedEditor = computed(() => {
    const currentUserId = this.authService.currentUserState()?.id;
    return Boolean(currentUserId && this.editors().some((editor) =>
      editor.active && editor.user_id === currentUserId,
    ));
  });
  readonly canDelete = computed(() => this.isAdmin() || this.isOwner());
  readonly canPublish = computed(() => {
    const currentEvent = this.event();
    return Boolean(
      currentEvent
      && currentEvent.status !== 'PUBLISHED'
      && (this.isAdmin() || this.isOwner() || this.isAssignedEditor()),
    );
  });
  readonly canManageActivities = computed(() => this.isOwner() || this.isAssignedEditor());
  readonly canManageTeam = computed(() => this.isOwner());
  readonly canViewEnrollments = computed(() =>
    this.authService.hasAnyRole(CONTENT_MANAGEMENT_ROLES),
  );
  readonly showOperationFeedback = computed(() =>
    this.operation() === 'loading' || this.operation() === 'deleting',
  );
  readonly isStepAvailable = (step: EventEditorStep): boolean =>
    !this.creationFlow() || this.stepIndex(step) <= this.lastUnlockedStep();
  readonly isStepComplete = (step: EventEditorStep): boolean => {
    if (!this.creationFlow() && this.event()) return step !== this.activeStep();
    return this.creationCompleted() || this.stepIndex(step) < this.lastUnlockedStep();
  };
  readonly isCreationComplete = computed(() => this.creationFlow() && this.creationCompleted());
  readonly enrollmentStateLabel = eventEnrollmentStateLabel;
  readonly publicationStatusLabel = eventPublicationStatusLabel;
  readonly executionStatusLabel = eventExecutionStatusLabel;
  readonly operationLabel = computed(() => {
    switch (this.operation()) {
      case 'loading': return 'Carregando evento...';
      case 'saving': return 'Salvando informações do evento...';
      case 'publishing': return 'Publicando evento...';
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
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.editingExisting.set(true);
    this.creationFlow.set(false);
    this.lastUnlockedStep.set(this.steps.length - 1);
    if (!/^\d+$/.test(id)) {
      this.errorMessage.set('O identificador do evento é inválido.');
      return;
    }
    this.loadEvent(id);
  }

  save(): void {
    if (this.isBusy()) return;
    if (this.form.invalid || !this.hasValidDates() || !this.hasValidEnrollmentDates()) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Revise os campos obrigatórios, as datas do evento e o período de inscrições.');
      return;
    }

    const value = this.form.getRawValue();
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
        } satisfies CreateEventPayload).pipe(
          switchMap((createdEvent) => this.hasEnrollmentSettings()
            ? this.eventsService.update(createdEvent.id, this.buildBasicUpdatePayload())
            : of(createdEvent)),
        );

    request.pipe(finalize(() => this.operation.set('idle'))).subscribe({
      next: (savedEvent) => {
        this.applyEvent(savedEvent, this.presentationForm.getRawValue());

        if (!currentEvent) {
          this.editingExisting.set(true);
          this.ownedEventIds.update((ids) => new Set(ids).add(savedEvent.id));
          this.location.replaceState(`/eventos/${savedEvent.id}/editar`);
          this.advanceTo('presentation');
          return;
        }

        this.advanceTo('presentation');
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.getErrorMessage(error, 'Não foi possível salvar o evento.'));
      },
    });
  }

  savePresentation(): void {
    const currentEvent = this.event();
    if (!currentEvent || this.isBusy()) return;
    if (
      this.form.invalid
      || this.presentationForm.invalid
      || !this.hasValidDates()
      || !this.hasValidEnrollmentDates()
    ) {
      this.form.markAllAsTouched();
      this.presentationForm.markAllAsTouched();
      this.errorMessage.set('Revise as informações e as datas de inscrição antes de continuar.');
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
        this.advanceTo('schedule');
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.getErrorMessage(error, 'Não foi possível atualizar a página do evento.'));
      },
    });
  }

  selectStep(step: EventEditorStep): void {
    if (!this.isStepAvailable(step)) {
      this.errorMessage.set('Avance pelas etapas para continuar a criação do evento.');
      return;
    }

    if (step === 'team' && !this.canManageTeam()) {
      this.errorMessage.set('Apenas o responsável pelo evento pode gerenciar a equipe.');
      return;
    }

    this.activeStep.set(step);
  }

  continueFromSchedule(): void {
    if (!this.event() || this.isBusy()) return;
    this.errorMessage.set(null);
    this.advanceTo('team');
  }

  continueFromTeam(): void {
    if (!this.event() || this.isBusy()) return;
    this.errorMessage.set(null);
    this.loadEnrollments(this.event()!.id);
    this.advanceTo('review');
  }

  completeCreation(): void {
    if (this.creationFlow()) {
      this.publish();
      return;
    }

    const currentEvent = this.event();
    if (!currentEvent || this.isBusy()) return;
    if (
      this.form.invalid
      || this.presentationForm.invalid
      || !this.hasValidDates()
      || !this.hasValidEnrollmentDates()
    ) {
      this.form.markAllAsTouched();
      this.presentationForm.markAllAsTouched();
      this.errorMessage.set('Revise as informações do evento antes de concluir.');
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
        this.successMessage.set('Alterações do evento salvas com sucesso.');
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.getErrorMessage(error, 'Não foi possível concluir o evento.'));
      },
    });
  }

  publish(): void {
    const currentEvent = this.event();
    if (!currentEvent || !this.canPublish() || this.isBusy()) return;
    if (
      this.form.invalid
      || this.presentationForm.invalid
      || !this.hasValidDates()
      || !this.hasValidEnrollmentDates()
    ) {
      this.form.markAllAsTouched();
      this.presentationForm.markAllAsTouched();
      this.errorMessage.set('Revise as informações do evento antes de publicar.');
      return;
    }

    this.operation.set('publishing');
    this.errorMessage.set(null);
    this.successMessage.set(null);
    const presentation = this.presentationForm.getRawValue();
    this.eventsService.update(currentEvent.id, this.buildCompleteUpdatePayload()).pipe(
      switchMap((savedEvent) => {
        this.applyEvent(savedEvent, presentation);
        return this.eventsService.publish(savedEvent.id);
      }),
      finalize(() => this.operation.set('idle')),
    ).subscribe({
      next: (publishedEvent) => {
        this.applyEvent(publishedEvent, presentation);
        if (publishedEvent.status !== 'PUBLISHED') {
          this.errorMessage.set('O evento foi salvo, mas a API não confirmou a publicação. Ele permanece como rascunho.');
          return;
        }

        const shouldOpenPublicPage = this.creationFlow() && !this.creationCompleted();
        this.creationCompleted.set(true);
        const message = 'Evento publicado com sucesso! A página já está disponível para o público.';
        this.successMessage.set(message);
        if (shouldOpenPublicPage) {
          void this.router.navigate(['/eventos', publishedEvent.id], {
            state: { eventFeedback: message },
          });
        }
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.getErrorMessage(error, 'O evento foi salvo, mas não foi possível publicá-lo.'));
      },
    });
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
    const activityId = this.editingActivityId();
    this.operation.set('activity');
    this.errorMessage.set(null);
    this.successMessage.set(null);
    const request = activityId
      ? this.eventsService.updateActivity(activityId, payload)
      : this.eventsService.createActivity(currentEvent.id, payload);

    request.pipe(
      finalize(() => this.operation.set('idle')),
    ).subscribe({
      next: (activity) => {
        this.activities.update((activities) => activityId
          ? activities.map((item) => item.id === activity.id ? activity : item)
          : [...activities, activity]);
        this.activityForm.reset({ title: '', description: '' });
        this.editingActivityId.set(null);
        this.loadActivities(currentEvent.id);
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
    this.successMessage.set(null);
    this.eventsService.deleteActivity(activity.id).pipe(
      finalize(() => this.operation.set('idle')),
    ).subscribe({
      next: () => {
        this.activities.update((activities) => activities.filter((item) => item.id !== activity.id));
        if (this.editingActivityId() === activity.id) this.cancelActivityEdit();
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.getErrorMessage(error, 'Não foi possível excluir a atividade.'));
      },
    });
  }

  editActivity(activity: EventActivity): void {
    if (this.isBusy()) return;
    this.editingActivityId.set(activity.id);
    this.activityForm.reset({
      title: activity.title,
      description: activity.description ?? '',
    });
    this.errorMessage.set(null);
  }

  cancelActivityEdit(): void {
    this.editingActivityId.set(null);
    this.activityForm.reset({ title: '', description: '' });
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
    this.successMessage.set(null);
    this.eventsService.addEditor(currentEvent.id, email).pipe(
      finalize(() => this.operation.set('idle')),
    ).subscribe({
      next: () => {
        this.editorForm.reset({ email: '' });
        this.loadEditors(currentEvent.id);
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
    this.successMessage.set(null);
    this.eventsService.removeEditor(currentEvent.id, editor.email_address).pipe(
      finalize(() => this.operation.set('idle')),
    ).subscribe({
      next: () => {
        this.editors.update((editors) => editors.filter((item) => item.id !== editor.id));
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
        this.loadEnrollments(event.id);
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.getErrorMessage(error, 'Não foi possível carregar o evento.'));
      },
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

  loadMoreEnrollments(): void {
    const currentEvent = this.event();
    const nextCursor = this.enrollmentsNextCursor();
    if (!currentEvent || !nextCursor || this.enrollmentsLoading()) return;

    this.enrollmentsLoading.set(true);
    this.eventsService.getEnrollments(currentEvent.id, nextCursor).pipe(
      finalize(() => this.enrollmentsLoading.set(false)),
    ).subscribe({
      next: (page) => {
        const byId = new Map(this.enrollments().map((enrollment) => [enrollment.id, enrollment]));
        page.content.forEach((enrollment) => byId.set(enrollment.id, enrollment));
        this.enrollments.set([...byId.values()]);
        this.enrollmentsNextCursor.set(page.next_cursor);
      },
      error: () => this.enrollmentsError.set('Não foi possível carregar mais inscritos.'),
    });
  }

  private loadEnrollments(eventId: number): void {
    if (!this.canViewEnrollments() || this.enrollmentsLoading()) return;

    this.enrollmentsLoading.set(true);
    this.enrollmentsError.set(null);
    this.eventsService.getEnrollments(eventId).pipe(
      finalize(() => this.enrollmentsLoading.set(false)),
    ).subscribe({
      next: (page) => {
        this.enrollments.set(page.content);
        this.enrollmentsNextCursor.set(page.next_cursor);
      },
      error: () => {
        this.enrollments.set([]);
        this.enrollmentsError.set('Não foi possível carregar os inscritos deste evento.');
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
      ...(value.enrollment_start_date ? { enrollment_start_date: value.enrollment_start_date } : {}),
      ...(value.enrollment_end_date ? { enrollment_end_date: value.enrollment_end_date } : {}),
      enrollment_paused: value.enrollment_paused,
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
    const currentEvent = this.event();
    const formValue = this.form.getRawValue();
    const enrichedEvent: EventDetails = {
      ...(currentEvent ?? {}),
      ...event,
      title: event.title ?? currentEvent?.title ?? formValue.title,
      slug: event.slug ?? currentEvent?.slug ?? '',
      format: event.format ?? currentEvent?.format ?? formValue.format,
      category: event.category ?? currentEvent?.category ?? formValue.category,
      start_date: event.start_date ?? currentEvent?.start_date ?? formValue.start_date ?? null,
      end_date: event.end_date ?? currentEvent?.end_date ?? formValue.end_date ?? null,
      enrollment_start_date: event.enrollment_start_date
        ?? currentEvent?.enrollment_start_date
        ?? formValue.enrollment_start_date
        ?? null,
      enrollment_end_date: event.enrollment_end_date
        ?? currentEvent?.enrollment_end_date
        ?? formValue.enrollment_end_date
        ?? null,
      enrollment_paused: event.enrollment_paused
        ?? currentEvent?.enrollment_paused
        ?? formValue.enrollment_paused,
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
      enrollment_start_date: this.toLocalInput(enrichedEvent.enrollment_start_date ?? null),
      enrollment_end_date: this.toLocalInput(enrichedEvent.enrollment_end_date ?? null),
      enrollment_paused: enrichedEvent.enrollment_paused ?? false,
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

  enrollmentDatesError(): string | null {
    const start = this.form.controls.enrollment_start_date.value;
    const end = this.form.controls.enrollment_end_date.value;
    const eventEnd = this.form.controls.end_date.value;

    if (!start && !end) return null;
    if (!start || !end) return 'Informe a abertura e o encerramento das inscrições.';
    if (new Date(start).getTime() > new Date(end).getTime()) {
      return 'O encerramento deve ocorrer depois da abertura das inscrições.';
    }
    if (eventEnd && new Date(end).getTime() > new Date(eventEnd).getTime()) {
      return 'As inscrições devem encerrar até o término do evento.';
    }

    return null;
  }

  private hasValidEnrollmentDates(): boolean {
    return this.enrollmentDatesError() === null;
  }

  private hasEnrollmentSettings(): boolean {
    const value = this.form.getRawValue();
    return Boolean(value.enrollment_start_date || value.enrollment_end_date || value.enrollment_paused);
  }

  private advanceTo(step: EventEditorStep): void {
    this.lastUnlockedStep.update((lastStep) => Math.max(lastStep, this.stepIndex(step)));
    this.activeStep.set(step);
  }

  private stepIndex(step: EventEditorStep): number {
    return this.steps.findIndex((item) => item.value === step);
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
