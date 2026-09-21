import { DatePipe, Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, HostListener, ViewChild, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, finalize, map, Observable, of, switchMap } from 'rxjs';
import { ADMINISTRATION_ROLES, CONTENT_MANAGEMENT_ROLES } from '../../../auth/config/auth.config';
import { AuthService } from '../../../auth/services/auth.service';
import { apiErrorMessage } from '../../../../core/api/api-error';
import { StorageService } from '../../../../core/storage/storage.service';
import {
  ActivityPayload,
  ACTIVITY_REGISTRATION_POLICY_OPTIONS,
  ActivityRegistrationPolicy,
  ActivityRegistrationPolicyOption,
  activityRegistrationPolicyLabel,
  activityRegistrationPolicyDescription,
  ApiMessage,
  CreateEventPayload,
  EVENT_ACTIVITY_TYPE_OPTIONS,
  EVENT_CATEGORY_OPTIONS,
  EVENT_FORMAT_OPTIONS,
  EventActivity,
  EventActivityType,
  EventCategory,
  EventDetails,
  EventEditor,
  EventEnrollment,
  EventFormat,
  UpdateEventPayload,
  eventActivityTypeLabel,
  eventActivityWeekdayLabel,
  eventExecutionStatusLabel,
  eventEditorStatusLabel,
  eventEnrollmentStateLabel,
  eventPublicationStatusLabel,
  apiMessage,
  buildEventActivityDays,
} from '../../models/event.model';
import { EventsService } from '../../services/events.service';
import { EventGuestsComponent } from '../../components/event-guests/event-guests.component';
import { ActivityPeopleComponent } from '../../components/activity-people/activity-people.component';

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
  imports: [DatePipe, ReactiveFormsModule, RouterLink, EventGuestsComponent, ActivityPeopleComponent],
  templateUrl: './event-editor.component.html',
  styleUrls: ['./event-editor.component.css', './event-activity-dialog.css'],
})
export class EventEditorComponent implements OnInit {
  @ViewChild('activityDialog') private activityDialog?: ElementRef<HTMLDialogElement>;
  readonly activityDialogDay = signal<string | null>(null);
  readonly activityDialogEndDay = signal<string | null>(null);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly eventsService = inject(EventsService);
  private readonly storageService = inject(StorageService);
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
    title: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(255)]],
    description: ['', Validators.maxLength(1000)],
    type: this.fb.nonNullable.control<EventActivityType>('LECTURE', Validators.required),
    location: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(255)]],
    start_date: ['', Validators.required],
    end_date: ['', Validators.required],
    registration_policy: this.fb.nonNullable.control<ActivityRegistrationPolicy>('ACTIVITY_REGISTRANTS_ONLY', Validators.required),
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
  readonly activitiesLoading = signal(false);
  readonly activitiesError = signal<string | null>(null);
  readonly activeActivityDay = signal<string | null>(null);
  readonly editors = signal<EventEditor[]>([]);
  readonly editorAccessResolved = signal(false);
  readonly enrollments = signal<EventEnrollment[]>([]);
  readonly enrollmentsNextCursor = signal<string | null>(null);
  readonly enrollmentsLoading = signal(false);
  readonly enrollmentsError = signal<string | null>(null);
  readonly ownedEventIds = signal<ReadonlySet<number>>(new Set());
  readonly editableEventIds = signal<ReadonlySet<number>>(new Set());
  readonly operation = signal<EditorOperation>('idle');
  readonly uploadingCover = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly hasUnsavedChanges = signal(false);
  readonly categories = EVENT_CATEGORY_OPTIONS;
  readonly formats = EVENT_FORMAT_OPTIONS;
  readonly activityTypes = EVENT_ACTIVITY_TYPE_OPTIONS;
  readonly activityRegistrationPolicies = ACTIVITY_REGISTRATION_POLICY_OPTIONS;
  readonly activityPolicyLabel = activityRegistrationPolicyLabel;
  readonly activityPolicyDescription = activityRegistrationPolicyDescription;
  readonly activityPolicyMenuOpen = signal(false);
  readonly selectedActivityPolicy = computed(() => this.activityRegistrationPolicies.find(
    (policy) => policy.value === this.activityForm.controls.registration_policy.value,
  ) ?? this.activityRegistrationPolicies[1]);
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
    const currentEvent = this.event();
    const currentUserId = this.authService.currentUserState()?.id;
    return Boolean(currentEvent && this.editableEventIds().has(currentEvent.id))
      || Boolean(currentUserId && this.editors().some((editor) =>
        editor.active && editor.user_id === currentUserId,
      ));
  });
  readonly canEditEvent = computed(() => this.isAdmin() || this.isOwner() || this.isAssignedEditor());
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
  readonly activitySchedule = computed(() => buildEventActivityDays(
    this.event()?.start_date, this.event()?.end_date, this.activities(),
  ).map((day) => ({ ...day, count: day.slots.reduce((total, slot) => total + slot.activities.length, 0) })));
  readonly visibleActivityDay = computed(() => {
    const schedule = this.activitySchedule();
    return schedule.find((day) => day.key === this.activeActivityDay()) ?? schedule[0] ?? null;
  });
  readonly conflictPolicy = this.fb.nonNullable.control<'' | 'PREVENT' | 'ALLOW'>('');

  saveConflictPolicy(): void {
    const event = this.event();
    const policy = this.conflictPolicy.value;
    if (!event || !policy || this.isBusy()) return;
    this.operation.set('saving'); this.errorMessage.set(null);
    this.eventsService.update(event.id, { schedule_conflict_policy: policy }).pipe(
      finalize(() => this.operation.set('idle')),
    ).subscribe({
      next: () => this.successMessage.set('Regra de conflito atualizada. A API ainda não devolve essa configuração na consulta do evento.'),
      error: (error: unknown) => this.errorMessage.set(apiErrorMessage(error, 'Não foi possível atualizar a regra de conflito.')),
    });
  }
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
  readonly editorStatusLabel = eventEditorStatusLabel;
  readonly activityTypeLabel = eventActivityTypeLabel;
  readonly activityWeekdayLabel = eventActivityWeekdayLabel;
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
          this.ownedEventIds.update((ids) => new Set(ids).add(savedEvent.id));
          // This event has just been created by the authenticated user. There is no
          // editor-list request in this transition, so resolve the edit access here
          // instead of leaving the next step in its loading state.
          this.editorAccessResolved.set(true);
          this.editingExisting.set(true);
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
    if (!currentEvent || this.isBusy()) return;
    if (!this.canManageActivities()) {
      this.errorMessage.set('Você não tem permissão para alterar a programação deste evento.');
      return;
    }
    if (this.activityForm.invalid || this.activityDatesError()) {
      this.activityForm.markAllAsTouched();
      this.errorMessage.set(this.activityDatesError() ?? 'Revise os dados obrigatórios e os horários da atividade.');
      return;
    }

    const value = this.activityForm.getRawValue();
    const activityId = this.editingActivityId();
    const payload: ActivityPayload = {
      title: value.title.trim(),
      description: value.description.trim(),
      type: value.type,
      location: value.location.trim(),
      start_date: value.start_date,
      end_date: value.end_date,
      registration_policy: value.registration_policy,
    };
    this.operation.set('activity');
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.activitiesError.set(null);
    const request = activityId
      ? this.eventsService.updateActivity(activityId, payload)
      : this.eventsService.createActivity(currentEvent.id, {
          title: payload.title, description: payload.description,
        }).pipe(
          switchMap((created) => {
            // Keep the persisted ID and input when PATCH fails: retry must not create duplicates.
            this.editingActivityId.set(created.id);
            this.activities.update((items) => [...items.filter((item) => item.id !== created.id), created]);
            return this.eventsService.updateActivity(created.id, payload);
          }),
        );

    request.pipe(
      finalize(() => this.operation.set('idle')),
    ).subscribe({
      next: (activity) => {
        this.activities.update((activities) => [...activities.filter((item) => item.id !== activity.id), activity]);
        this.ensureActiveActivityDay();
        if (this.activityResponseMatchesPayload(activity, payload)) {
          this.successMessage.set(activityId
            ? 'Atividade atualizada na programação.'
            : 'Atividade adicionada à programação.');
        } else {
          this.errorMessage.set(
            'A resposta da API não confirmou todos os dados da atividade. Confira a programação antes de continuar.',
          );
          return;
        }
        this.resetActivityForm();
        this.editingActivityId.set(null);
        this.activityDialog?.nativeElement.close();
        this.activityDialogDay.set(null);
        this.activityDialogEndDay.set(null);
        this.loadActivities(currentEvent.id);
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.getErrorMessage(error, 'Não foi possível adicionar a atividade.'));
      },
    });
  }

  deleteActivity(activity: EventActivity): void {
    if (this.isBusy() || !this.canManageActivities()) return;
    if (typeof window !== 'undefined' && !window.confirm(`Excluir a atividade “${activity.title}”?`)) return;

    this.operation.set('activity');
    this.successMessage.set(null);
    this.errorMessage.set(null);
    this.eventsService.deleteActivity(activity.id).pipe(
      finalize(() => this.operation.set('idle')),
    ).subscribe({
      next: (response) => {
        this.activities.update((activities) => activities.filter((item) => item.id !== activity.id));
        this.ensureActiveActivityDay();
        if (this.editingActivityId() === activity.id) this.cancelActivityEdit();
        this.successMessage.set(apiMessage(response, 'Atividade excluída da programação.'));
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.getErrorMessage(error, 'Não foi possível excluir a atividade.'));
      },
    });
  }

  editActivity(activity: EventActivity): void {
    if (this.isBusy() || !this.canManageActivities()) return;
    const startDay = this.toLocalInput(activity.start_date ?? null).slice(0, 10);
    const fallbackDay = this.activitySchedule().find((day) => this.canAddActivityOnDay(day.key))?.key;
    const day = this.canAddActivityOnDay(startDay) ? startDay : fallbackDay;
    if (!day) {
      this.errorMessage.set('Defina o período do evento antes de editar a programação.');
      return;
    }
    this.activeActivityDay.set(day);
    this.activityDialogDay.set(day);
    // Do not silently shorten an existing activity spanning multiple days.
    const endDay = this.toLocalInput(activity.end_date ?? null).slice(0, 10);
    this.activityDialogEndDay.set(this.canAddActivityOnDay(endDay) && endDay >= day ? endDay : day);
    this.editingActivityId.set(activity.id);
    this.activityForm.reset({
      title: activity.title,
      description: activity.description ?? '',
      type: activity.type ?? 'OTHER',
      location: activity.location ?? '',
      start_date: this.toLocalInput(activity.start_date ?? null),
      end_date: this.toLocalInput(activity.end_date ?? null),
      registration_policy: activity.registration_policy ?? 'ACTIVITY_REGISTRANTS_ONLY',
    });
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.activityDialog?.nativeElement.showModal();
  }

  /** Sends a local cover image to storage and keeps the resulting public URL in the form. */
  uploadCover(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || this.uploadingCover() || this.isBusy()) return;

    if (!file.type.startsWith('image/')) {
      this.errorMessage.set('Selecione um arquivo de imagem válido.');
      input.value = '';
      return;
    }

    this.uploadingCover.set(true);
    this.errorMessage.set(null);
    this.storageService.upload(file).pipe(
      finalize(() => {
        this.uploadingCover.set(false);
        input.value = '';
      }),
    ).subscribe({
      next: (response) => {
        this.presentationForm.controls.cover_image_url.setValue(response.url);
        this.presentationForm.controls.cover_image_url.markAsTouched();
        this.successMessage.set('Imagem enviada. Ela será aplicada ao avançar ou salvar o evento.');
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.getErrorMessage(error, 'Não foi possível enviar a imagem.'));
      },
    });
  }

  cancelActivityEdit(): void {
    if (this.isBusy()) return;
    if (this.activityForm.dirty && typeof window !== 'undefined'
      && !window.confirm('Descartar as alterações desta atividade?')) return;
    this.activityDialog?.nativeElement.close();
    this.activityDialogDay.set(null);
    this.activityDialogEndDay.set(null);
    this.editingActivityId.set(null);
    this.resetActivityForm();
  }

  onActivityDialogCancel(event: Event): void {
    event.preventDefault();
    this.cancelActivityEdit();
  }

  openActivityDialog(): void {
    const day = this.visibleActivityDay()?.key;
    if (!day || this.isBusy() || !this.canManageActivities() || !this.canAddActivityOnDay(day)) return;
    this.resetActivityForm();
    this.editingActivityId.set(null);
    this.activityDialogDay.set(day);
    this.activityDialogEndDay.set(day);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.activityPolicyMenuOpen.set(false);
    this.activityDialog?.nativeElement.showModal();
  }

  canAddActivityOnDay(day: string): boolean {
    const start = this.toLocalInput(this.event()?.start_date ?? null);
    const end = this.toLocalInput(this.event()?.end_date ?? null);
    return /^\d{4}-\d{2}-\d{2}$/.test(day) && !!start && !!end
      && start.slice(0, 10) <= day && day <= end.slice(0, 10);
  }

  activityTimeBounds(day: string | null): { min: string; max: string } {
    const start = this.toLocalInput(this.event()?.start_date ?? null);
    const end = this.toLocalInput(this.event()?.end_date ?? null);
    return {
      min: start.slice(0, 10) === day ? start.slice(11) : '00:00',
      max: end.slice(0, 10) === day ? end.slice(11) : '23:59',
    };
  }

  setActivityTime(field: 'start_date' | 'end_date', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    const day = field === 'start_date' ? this.activityDialogDay() : this.activityDialogEndDay();
    this.activityForm.controls[field].setValue(day && value ? `${day}T${value}` : '');
    this.activityForm.controls[field].markAsDirty();
  }

  toggleActivityPolicyMenu(): void {
    this.activityPolicyMenuOpen.update((open) => !open);
  }

  selectActivityPolicy(policy: ActivityRegistrationPolicyOption): void {
    this.activityForm.controls.registration_policy.setValue(policy.value);
    this.activityForm.controls.registration_policy.markAsDirty();
    this.activityPolicyMenuOpen.set(false);
  }

  closeActivityPolicyMenu(): void {
    this.activityPolicyMenuOpen.set(false);
  }

  selectActivityDay(dayKey: string): void {
    this.activeActivityDay.set(dayKey);
  }

  navigateActivityDays(event: KeyboardEvent, dayKey: string): void {
    const days = this.activitySchedule();
    const index = days.findIndex((day) => day.key === dayKey);
    let next: number;
    switch (event.key) {
      case 'ArrowRight': next = (index + 1) % days.length; break;
      case 'ArrowLeft': next = (index - 1 + days.length) % days.length; break;
      case 'Home': next = 0; break;
      case 'End': next = days.length - 1; break;
      default: return;
    }
    event.preventDefault();
    this.selectActivityDay(days[next].key);
    (event.currentTarget as HTMLElement).parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  }

  activityDatesError(): string | null {
    const start = this.activityForm.controls.start_date.value;
    const end = this.activityForm.controls.end_date.value;
    if (!start || !end) return null;
    if (this.activityDialogDay() && (start.slice(0, 10) !== this.activityDialogDay()
      || end.slice(0, 10) !== this.activityDialogEndDay())) {
      return 'Selecione novamente os horários para o dia indicado no formulário.';
    }

    const startTimestamp = new Date(start).getTime();
    const endTimestamp = new Date(end).getTime();
    if (!Number.isFinite(startTimestamp) || !Number.isFinite(endTimestamp)) {
      return 'Informe um horário válido para a atividade.';
    }
    if (startTimestamp >= endTimestamp) {
      return 'O término da atividade deve ocorrer depois do início.';
    }

    const eventStart = this.event()?.start_date;
    const eventEnd = this.event()?.end_date;
    if (
      eventStart
      && eventEnd
      && (startTimestamp < new Date(eventStart).getTime() || endTimestamp > new Date(eventEnd).getTime())
    ) {
      return 'A atividade deve acontecer dentro do período do evento.';
    }
    return null;
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
      switchMap((response) => this.eventsService.getEditors(currentEvent.id).pipe(
        map((page) => ({
          response,
          editors: page.content.filter((editor) => editor.status !== 'REVOKED'),
        })),
        // A API já confirmou a inclusão; uma falha pontual na recarga não deve
        // transformar essa confirmação em uma falsa falha para o organizador.
        catchError(() => of({ response, editors: null as EventEditor[] | null })),
      )),
      finalize(() => this.operation.set('idle')),
    ).subscribe({
      next: ({ response, editors }: { response: ApiMessage; editors: EventEditor[] | null }) => {
        this.editorForm.reset({ email: '' });
        if (editors !== null) this.editors.set(editors);

        const message = apiMessage(response, 'Colaborador adicionado à equipe com sucesso.');
        this.successMessage.set(editors === null
          ? `${message} A lista da equipe não pôde ser atualizada agora; recarregue a página para conferi-la.`
          : message,
        );
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

  retryLoadEvent(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id || this.isBusy()) return;
    this.errorMessage.set(null);
    this.loadEvent(id);
  }

  canDeactivate(): boolean {
    if ((!this.hasUnsavedChanges() && !(this.activityDialogDay() && this.activityForm.dirty)) || typeof window === 'undefined') return true;
    return window.confirm('Há alterações não salvas. Deseja sair mesmo assim?');
  }

  @HostListener('window:beforeunload', ['$event'])
  preventUnsavedUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges() || (this.activityDialogDay() && this.activityForm.dirty)) event.preventDefault();
  }

  private loadEvent(id: string): void {
    this.operation.set('loading');
    this.eventsService.getById(id).pipe(
      finalize(() => this.operation.set('idle')),
    ).subscribe({
      next: (event) => {
        this.applyEvent(event);
        this.loadActivities(event.id);
        this.loadEditorAccess();
        this.loadEditors(event.id);
        this.loadEnrollments(event.id);
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.getErrorMessage(error, 'Não foi possível carregar o evento.'));
        this.editorAccessResolved.set(true);
      },
    });
  }

  private loadEditors(eventId: number): void {
    this.eventsService.getEditors(eventId).subscribe({
      next: (page) => {
        this.editors.set(page.content.filter((editor) => editor.status !== 'REVOKED'));
      },
      error: () => {
        this.editors.set([]);
      },
    });
  }

  private loadEditorAccess(): void {
    this.editorAccessResolved.set(false);
    this.eventsService.getEditableEvents(undefined, 50).subscribe({
      next: (page) => {
        this.editableEventIds.set(new Set(page.content.map((event) => event.id)));
        this.editorAccessResolved.set(true);
      },
      error: () => this.editorAccessResolved.set(true),
    });
  }

  private loadActivities(eventId: number): void {
    this.activitiesLoading.set(true);
    this.activitiesError.set(null);
    this.eventsService.getAllActivities(eventId).pipe(
      finalize(() => this.activitiesLoading.set(false)),
    ).subscribe({
      next: (activities) => {
        this.activities.set(activities);
        this.ensureActiveActivityDay();
      },
      // A atividade recém-criada continua visível caso a listagem falhe pontualmente.
      error: (error: unknown) => {
        this.activitiesError.set(this.getErrorMessage(error, 'Não foi possível atualizar a programação.'));
      },
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
      activities: currentEvent?.id === event.id ? this.activities() : event.activities ?? [],
    };
    this.event.set(enrichedEvent);
    this.activities.set(enrichedEvent.activities ?? []);
    this.ensureActiveActivityDay();
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

  private resetActivityForm(): void {
    this.activityForm.reset({
      title: '',
      description: '',
      type: 'LECTURE',
      location: '',
      start_date: '',
      end_date: '',
      registration_policy: 'ACTIVITY_REGISTRANTS_ONLY',
    });
  }

  private ensureActiveActivityDay(): void {
    const schedule = this.activitySchedule();
    if (!schedule.some((day) => day.key === this.activeActivityDay())) {
      this.activeActivityDay.set(schedule[0]?.key ?? null);
    }
  }

  private activityResponseMatchesPayload(activity: EventActivity, payload: ActivityPayload): boolean {
    const sameDate = (left: string | null | undefined, right: string): boolean => {
      if (!left) return false;
      const leftTimestamp = new Date(left).getTime();
      const rightTimestamp = new Date(right).getTime();
      return Number.isFinite(leftTimestamp) && Number.isFinite(rightTimestamp)
        ? leftTimestamp === rightTimestamp
        : left === right;
    };
    return activity.type === payload.type
      && activity.location?.trim() === payload.location
      && sameDate(activity.start_date, payload.start_date)
      && sameDate(activity.end_date, payload.end_date)
      && activity.registration_policy === payload.registration_policy;
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
    if (!value) return '';
    if (!/(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) return value.slice(0, 16);

    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return value.slice(0, 16);
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return localDate.toISOString().slice(0, 16);
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const message = apiErrorMessage(error, '');
      if (message) return message;
      if (error.status === 403) return 'Você não tem permissão para realizar esta operação.';
      if (error.status === 404) return 'O recurso solicitado não foi encontrado.';
    }
    return fallback;
  }
}
