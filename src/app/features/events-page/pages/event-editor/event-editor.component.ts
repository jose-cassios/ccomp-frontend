import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, HostListener, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, Observable } from 'rxjs';
import { AuthService } from '../../../auth/services/auth.service';
import {
  ActivityPayload,
  CreateEventPayload,
  EVENT_CATEGORY_OPTIONS,
  EVENT_FORMAT_OPTIONS,
  EventActivity,
  EventCategory,
  EventDetails,
  EventFormat,
  EventListItem,
  UpdateEventPayload,
} from '../../models/event.model';
import { EventsService } from '../../services/events.service';

type EditorOperation = 'idle' | 'loading' | 'saving' | 'deleting' | 'activity' | 'editor';

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
  private readonly eventsService = inject(EventsService);
  private readonly authService = inject(AuthService);

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(255)]],
    description: ['', [Validators.minLength(4), Validators.maxLength(1000)]],
    category: this.fb.nonNullable.control<EventCategory>('ACADEMIC_EDUCATIONAL', Validators.required),
    format: this.fb.nonNullable.control<EventFormat>('IN_PERSON', Validators.required),
    start_date: ['', Validators.required],
    end_date: ['', Validators.required],
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
  readonly activities = signal<EventActivity[]>([]);
  readonly editors = signal<string[]>([]);
  readonly operation = signal<EditorOperation>('idle');
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly hasUnsavedChanges = signal(false);
  readonly categories = EVENT_CATEGORY_OPTIONS;
  readonly formats = EVENT_FORMAT_OPTIONS;
  readonly currentUser = this.authService.currentUserState;
  readonly isBusy = computed(() => this.operation() !== 'idle');
  readonly isOwner = computed(() => this.event()?.owner_id === this.currentUser()?.id);
  readonly canChangeCategory = computed(() =>
    !this.editingExisting() || this.event()?.category !== undefined,
  );

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.hasUnsavedChanges.set(true);
      this.successMessage.set(null);
    });
  }

  ngOnInit(): void {
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
    const currentEvent = this.event();
    if (this.editingExisting() && !currentEvent) return;

    this.operation.set('saving');
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const request: Observable<EventDetails | EventListItem> = currentEvent
      ? this.eventsService.update(this.buildUpdatePayload(currentEvent))
      : this.eventsService.create({
          title: value.title,
          category: value.category,
          format: value.format,
          start_date: value.start_date,
          end_date: value.end_date,
        } satisfies CreateEventPayload);

    request.pipe(finalize(() => this.operation.set('idle'))).subscribe({
      next: (savedEvent) => {
        if (currentEvent) {
          this.applyEvent({ ...currentEvent, ...savedEvent });
        } else {
          const createdEvent = savedEvent as EventDetails;
          this.applyEvent(createdEvent);
          void this.router.navigate(['/eventos', createdEvent.id, 'editar'], { replaceUrl: true });
        }
        this.successMessage.set(currentEvent ? 'Evento atualizado com sucesso.' : 'Evento criado com sucesso.');
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.getErrorMessage(error, 'Não foi possível salvar o evento.'));
      },
    });
  }

  deleteEvent(): void {
    const currentEvent = this.event();
    if (!currentEvent || !this.isOwner() || this.isBusy()) return;
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
        this.successMessage.set('Atividade adicionada.');
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
        this.successMessage.set('Atividade excluída.');
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.getErrorMessage(error, 'Não foi possível excluir a atividade.'));
      },
    });
  }

  addEditor(): void {
    const currentEvent = this.event();
    if (!currentEvent || !this.isOwner() || this.editorForm.invalid || this.isBusy()) {
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
        this.editors.update((editors) => editors.includes(email) ? editors : [...editors, email]);
        this.editorForm.reset({ email: '' });
        this.successMessage.set(response.message);
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.getErrorMessage(error, 'Não foi possível adicionar o editor.'));
      },
    });
  }

  removeEditor(email: string): void {
    const currentEvent = this.event();
    if (!currentEvent || !this.isOwner() || this.isBusy()) return;

    this.operation.set('editor');
    this.eventsService.removeEditor(currentEvent.id, email).pipe(
      finalize(() => this.operation.set('idle')),
    ).subscribe({
      next: (response) => {
        this.editors.update((editors) => editors.filter((editor) => editor !== email));
        this.successMessage.set(response.message);
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.getErrorMessage(error, 'Não foi possível remover o editor.'));
      },
    });
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
      next: (event) => this.applyEvent(event),
      error: (error: unknown) => {
        this.errorMessage.set(this.getErrorMessage(error, 'Não foi possível carregar o evento.'));
      },
    });
  }

  private buildUpdatePayload(event: EventDetails): UpdateEventPayload {
    const value = this.form.getRawValue();
    const payload: UpdateEventPayload = {
      id: event.id,
      title: value.title,
      start_date: value.start_date,
      end_date: value.end_date,
    };

    if (event.category !== undefined && value.category !== event.category) {
      payload.event_category = value.category;
    }
    if (value.description && value.description !== (event.description ?? '')) {
      payload.description = value.description;
    }
    return payload;
  }

  private applyEvent(event: EventDetails): void {
    this.event.set({ ...event, activities: event.activities ?? [] });
    this.activities.set(event.activities ?? []);
    this.form.reset({
      title: event.title ?? '',
      description: event.description ?? '',
      category: event.category ?? 'ACADEMIC_EDUCATIONAL',
      format: event.format ?? 'IN_PERSON',
      start_date: this.toLocalInput(event.start_date),
      end_date: this.toLocalInput(event.end_date),
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
      const message = error.error?.message;
      if (typeof message === 'string' && message.trim()) return message;
      if (error.status === 403) return 'Você não tem permissão para realizar esta operação.';
      if (error.status === 404) return 'O recurso solicitado não foi encontrado.';
    }
    return fallback;
  }
}
