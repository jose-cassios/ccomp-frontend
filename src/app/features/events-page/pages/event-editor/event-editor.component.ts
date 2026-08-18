import { HttpErrorResponse } from '@angular/common/http';
import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { AuthService } from '../../../auth/services/auth.service';
import {
  ActivityPayload,
  CreateEventPayload,
  EVENT_CATEGORY_OPTIONS,
  EVENT_FORMAT_OPTIONS,
  EventCategory,
  EventActivity,
  EventDetails,
  EventFormat,
  UpdateEventPayload,
} from '../../models/event.model';
import { EventsService } from '../../services/events.service';

type EditorOperation =
  | 'idle'
  | 'loading'
  | 'saving'
  | 'deleting'
  | 'activity'
  | 'editor';

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
    description: ['', [Validators.maxLength(1000)]],
    category: this.fb.nonNullable.control<EventCategory>('ACADEMIC_EDUCATIONAL', Validators.required),
    format: this.fb.nonNullable.control<EventFormat>('IN_PERSON', Validators.required),
    start_date: ['', Validators.required],
    end_date: ['', Validators.required],
    address: [''],
    online_url: ['', Validators.pattern(/^https?:\/\/.+/)],
  });
  readonly activityForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(255)]],
    description: ['', Validators.maxLength(2000)],
  });
  readonly editorForm = this.fb.nonNullable.group({
    userId: ['', [
      Validators.required,
      Validators.pattern(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i),
    ]],
  });

  readonly event = signal<EventDetails | null>(null);
  readonly editingExisting = signal(false);
  readonly activities = signal<EventActivity[]>([]);
  readonly editors = signal<string[]>([]);
  readonly editingActivityId = signal<number | null>(null);
  readonly operation = signal<EditorOperation>('idle');
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly hasUnsavedChanges = signal(false);
  readonly categories = EVENT_CATEGORY_OPTIONS;
  readonly formats = EVENT_FORMAT_OPTIONS;
  readonly currentUser = this.authService.currentUserState;
  readonly isBusy = computed(() => this.operation() !== 'idle');
  readonly isOwner = computed(() => this.event()?.owner_id === this.currentUser()?.id);
  isOnline(): boolean {
    const format = this.form.controls.format.value;
    return format === 'ONLINE' || format === 'HYBRID';
  }

  isInPerson(): boolean {
    const format = this.form.controls.format.value;
    return format === 'IN_PERSON' || format === 'HYBRID';
  }

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

    const request = currentEvent
      ? this.eventsService.update({
          id: currentEvent.id,
          title: value.title,
          description: value.description,
          event_category: value.category,
          format: value.format,
          start_date: value.start_date,
          end_date: value.end_date,
          address: value.address,
          online_url: value.online_url,
        } satisfies UpdateEventPayload)
      : this.eventsService.create({
          title: value.title,
          description: value.description || undefined,
          category: value.category,
          format: value.format,
          start_date: value.start_date,
          end_date: value.end_date,
          address: value.address || undefined,
          online_url: value.online_url || undefined,
        } satisfies CreateEventPayload);

    request.pipe(finalize(() => this.operation.set('idle'))).subscribe({
      next: (savedEvent) => {
        this.applyEvent(savedEvent);
        if (!currentEvent) {
          void this.router.navigate(['/eventos', savedEvent.id, 'editar'], { replaceUrl: true });
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
    const editingId = this.editingActivityId();
    this.operation.set('activity');
    this.errorMessage.set(null);
    const request = editingId
      ? this.eventsService.updateActivity(editingId, payload)
      : this.eventsService.createActivity(currentEvent.id, payload);

    request.pipe(finalize(() => this.operation.set('idle'))).subscribe({
      next: (activity) => {
        this.activities.update((activities) => editingId
          ? activities.map((item) => item.id === activity.id ? activity : item)
          : [...activities, activity]);
        this.cancelActivityEdit();
        this.successMessage.set(editingId ? 'Atividade atualizada.' : 'Atividade adicionada.');
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.getErrorMessage(error, 'Não foi possível salvar a atividade.'));
      },
    });
  }

  editActivity(activity: EventActivity): void {
    this.editingActivityId.set(activity.id);
    this.activityForm.setValue({ title: activity.title, description: activity.description ?? '' });
  }

  cancelActivityEdit(): void {
    this.editingActivityId.set(null);
    this.activityForm.reset({ title: '', description: '' });
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

    const userId = this.editorForm.controls.userId.value.trim();
    this.operation.set('editor');
    this.errorMessage.set(null);
    this.eventsService.addEditor(currentEvent.id, userId).pipe(
      finalize(() => this.operation.set('idle')),
    ).subscribe({
      next: (response) => {
        this.editors.update((editors) => editors.includes(userId) ? editors : [...editors, userId]);
        this.editorForm.reset({ userId: '' });
        this.successMessage.set(response.message);
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.getErrorMessage(error, 'Não foi possível adicionar o editor.'));
      },
    });
  }

  removeEditor(userId: string): void {
    const currentEvent = this.event();
    if (!currentEvent || !this.isOwner() || this.isBusy()) return;

    this.operation.set('editor');
    this.eventsService.removeEditor(currentEvent.id, userId).pipe(
      finalize(() => this.operation.set('idle')),
    ).subscribe({
      next: (response) => {
        this.editors.update((editors) => editors.filter((id) => id !== userId));
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
    forkJoin({
      event: this.eventsService.getById(id),
      editableEvents: this.eventsService.getEditableEvents(),
    }).pipe(
      finalize(() => this.operation.set('idle')),
    ).subscribe({
      next: ({ event, editableEvents }) => {
        if (!editableEvents.some((item) => item.id === event.id)) {
          this.errorMessage.set('Você não tem permissão para editar este evento.');
          return;
        }
        this.applyEvent(event);
        if (event.owner_id === this.currentUser()?.id) this.loadEditors(event.id);
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.getErrorMessage(error, 'Não foi possível carregar o evento.'));
      },
    });
  }

  private loadEditors(eventId: number): void {
    this.eventsService.getEditors(eventId).subscribe({
      next: (editors) => this.editors.set(editors),
      error: () => this.errorMessage.set('O evento foi carregado, mas não foi possível listar seus editores.'),
    });
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
      address: event.address ?? '',
      online_url: event.online_url ?? '',
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
