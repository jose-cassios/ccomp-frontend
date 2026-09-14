import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../auth/services/auth.service';
import { EventDetails, EventEditor } from '../../models/event.model';
import { EventsService } from '../../services/events.service';
import { EventEditorComponent } from './event-editor.component';

describe('EventEditorComponent', () => {
  let component: EventEditorComponent;
  let fixture: ComponentFixture<EventEditorComponent>;
  let router: Router;

  const createdEvent: EventDetails = {
    id: 14,
    title: 'Semana da Computação',
    slug: 'semana-da-computacao',
    description: null,
    format: 'IN_PERSON',
    category: 'ACADEMIC_EDUCATIONAL',
    start_date: '2026-09-10T08:00:00',
    end_date: '2026-09-10T18:00:00',
    activities: [],
  };
  const activityPayload = {
    title: 'Abertura',
    description: '',
    type: 'LECTURE' as const,
    location: 'Auditório principal',
    start_date: '2026-09-10T08:00',
    end_date: '2026-09-10T09:00',
    registration_policy: 'ACTIVITY_REGISTRANTS_ONLY' as const,
  };
  const eventsService = {
    create: vi.fn(() => of(createdEvent)),
    update: vi.fn((_eventId: number, payload: { enrollment_start_date?: string; enrollment_end_date?: string; enrollment_paused?: boolean }) => of({
      ...createdEvent,
      enrollment_start_date: payload.enrollment_start_date ?? null,
      enrollment_end_date: payload.enrollment_end_date ?? null,
      enrollment_paused: payload.enrollment_paused ?? false,
    })),
    publish: vi.fn(() => of({ ...createdEvent, status: 'PUBLISHED' as const })),
    getById: vi.fn(() => of(createdEvent)),
    getAllActivities: vi.fn(() => of([])),
    getEditors: vi.fn(() => of({ content: [] as EventEditor[], next_cursor: null })),
    deleteEvent: vi.fn(() => of(void 0)),
    createActivity: vi.fn(() => of({ id: 21, event_id: createdEvent.id, ...activityPayload })),
    updateActivity: vi.fn((_id: number, payload: object) => of({
      id: 21,
      event_id: createdEvent.id,
      title: 'Abertura atualizada',
      description: 'Boas-vindas',
      type: 'WORKSHOP' as const,
      location: 'Laboratório 04',
      start_date: '2026-09-10T10:00',
      end_date: '2026-09-10T11:30',
      ...payload,
    })),
    deleteActivity: vi.fn(),
    addEditor: vi.fn(() => of({ message: 'Editor adicionado.' })),
    removeEditor: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [EventEditorComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({}) } } },
        { provide: AuthService, useValue: { hasAnyRole: () => false, currentUserState: () => ({ id: 'event-owner' }) } },
        { provide: EventsService, useValue: eventsService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EventEditorComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
    // jsdom does not implement the native dialog top layer; emulate only its open state.
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    dialog.showModal = vi.fn(() => dialog.setAttribute('open', ''));
    dialog.close = vi.fn(() => dialog.removeAttribute('open'));
  });

  it('should create the event with only the required API fields and advance to the presentation step', () => {
    component.form.setValue({
      title: createdEvent.title,
      category: createdEvent.category,
      format: createdEvent.format,
      start_date: '2026-09-10T08:00',
      end_date: '2026-09-10T18:00',
      enrollment_start_date: '',
      enrollment_end_date: '',
      enrollment_paused: false,
    });

    component.save();

    expect(eventsService.create).toHaveBeenCalledWith({
      title: createdEvent.title,
      category: createdEvent.category,
      format: createdEvent.format,
      start_date: '2026-09-10T08:00',
      end_date: '2026-09-10T18:00',
    });
    expect(component.event()?.id).toBe(createdEvent.id);
    expect(component.activeStep()).toBe('presentation');
    expect(component.editorAccessResolved()).toBe(true);
    expect(component.canEditEvent()).toBe(true);
    expect(component.successMessage()).toBeNull();
    expect(eventsService.addEditor).not.toHaveBeenCalled();
  });

  it('should preserve the dates filled in the form when an API response omits them', () => {
    eventsService.create.mockReturnValueOnce(of({
      ...createdEvent,
      start_date: null,
      end_date: null,
    }));
    component.form.setValue({
      title: createdEvent.title,
      category: createdEvent.category,
      format: createdEvent.format,
      start_date: '2026-09-10T08:00',
      end_date: '2026-09-10T18:00',
      enrollment_start_date: '',
      enrollment_end_date: '',
      enrollment_paused: false,
    });

    component.save();

    expect(component.form.controls.start_date.value).toBe('2026-09-10T08:00');
    expect(component.form.controls.end_date.value).toBe('2026-09-10T18:00');
    expect(component.activeStep()).toBe('presentation');
  });

  it('should send page details through PATCH /events/{eventId}', () => {
    component.form.setValue({
      title: createdEvent.title,
      category: createdEvent.category,
      format: createdEvent.format,
      start_date: '2026-09-10T08:00',
      end_date: '2026-09-10T18:00',
      enrollment_start_date: '2026-08-10T08:00',
      enrollment_end_date: '2026-09-09T18:00',
      enrollment_paused: false,
    });
    component.save();
    component.presentationForm.setValue({
      summary: 'Palestras e oficinas para a comunidade.',
      content: 'Uma programação completa com atividades para estudantes.',
      cover_image_url: 'https://example.com/capa.jpg',
    });

    component.savePresentation();

    expect(eventsService.update).toHaveBeenCalledWith(createdEvent.id, {
      title: createdEvent.title,
      summary: 'Palestras e oficinas para a comunidade.',
      content: 'Uma programação completa com atividades para estudantes.',
      cover_image_url: 'https://example.com/capa.jpg',
      category: createdEvent.category,
      format: createdEvent.format,
      start_date: '2026-09-10T08:00',
      end_date: '2026-09-10T18:00',
      enrollment_start_date: '2026-08-10T08:00',
      enrollment_end_date: '2026-09-09T18:00',
      enrollment_paused: false,
    });
  });

  it('should accept registrations before the event, but not after it ends', () => {
    component.form.setValue({
      title: createdEvent.title,
      category: createdEvent.category,
      format: createdEvent.format,
      start_date: '2026-09-10T08:00',
      end_date: '2026-09-10T18:00',
      enrollment_start_date: '2026-08-10T08:00',
      enrollment_end_date: '2026-09-10T17:00',
      enrollment_paused: false,
    });

    expect(component.enrollmentDatesError()).toBeNull();

    component.form.controls.enrollment_end_date.setValue('2026-09-11T08:00');

    expect(component.enrollmentDatesError()).toBe('As inscrições devem encerrar até o término do evento.');
    component.save();
    expect(eventsService.create).not.toHaveBeenCalled();
  });

  it('should persist an activity and refresh the saved schedule', () => {
    component.form.setValue({
      title: createdEvent.title,
      category: createdEvent.category,
      format: createdEvent.format,
      start_date: '2026-09-10T08:00',
      end_date: '2026-09-10T18:00',
      enrollment_start_date: '',
      enrollment_end_date: '',
      enrollment_paused: false,
    });
    component.save();
    component.activityForm.setValue({
      title: activityPayload.title,
      description: activityPayload.description,
      type: activityPayload.type,
      location: activityPayload.location,
      start_date: activityPayload.start_date,
      end_date: activityPayload.end_date,
      registration_policy: activityPayload.registration_policy,
    });

    component.saveActivity();

    expect(eventsService.createActivity).toHaveBeenCalledWith(createdEvent.id, {
      title: activityPayload.title, description: activityPayload.description,
    });
    expect(eventsService.updateActivity).toHaveBeenCalledWith(21, activityPayload);
    expect(eventsService.getAllActivities).toHaveBeenCalledWith(createdEvent.id);
    expect(component.successMessage()).toContain('adicionada');
  });

  it('should retain the created ID and form when PATCH fails, without creating duplicates on retry', () => {
    eventsService.updateActivity.mockReturnValueOnce(throwError(() => new Error('Network error')));
    eventsService.createActivity.mockReturnValueOnce(of({
      id: 22,
      event_id: createdEvent.id,
      title: activityPayload.title,
      description: activityPayload.description,
    }) as never);
    component.event.set({ ...createdEvent, owner_id: 'event-owner' });
    component.ownedEventIds.set(new Set([createdEvent.id]));
    component.activityForm.setValue({
      title: activityPayload.title,
      description: activityPayload.description,
      type: activityPayload.type,
      location: activityPayload.location,
      start_date: activityPayload.start_date,
      end_date: activityPayload.end_date,
      registration_policy: activityPayload.registration_policy,
    });

    component.saveActivity();

    expect(component.successMessage()).toBeNull();
    expect(component.errorMessage()).toBeTruthy();
    expect(component.editingActivityId()).toBe(22);
    expect(component.activityForm.getRawValue()).toEqual(activityPayload);
    component.saveActivity();
    expect(eventsService.createActivity).toHaveBeenCalledTimes(1);
    expect(eventsService.updateActivity).toHaveBeenLastCalledWith(22, activityPayload);
  });

  it('should update an existing activity through the activity PATCH route', () => {
    component.form.setValue({
      title: createdEvent.title,
      category: createdEvent.category,
      format: createdEvent.format,
      start_date: '2026-09-10T08:00',
      end_date: '2026-09-10T18:00',
      enrollment_start_date: '',
      enrollment_end_date: '',
      enrollment_paused: false,
    });
    component.save();
    component.editActivity({
      id: 21,
      event_id: createdEvent.id,
      title: 'Abertura',
      description: null,
    });
    component.activityForm.setValue({
      title: 'Abertura atualizada',
      description: 'Boas-vindas',
      type: 'WORKSHOP',
      location: 'Laboratório 04',
      start_date: '2026-09-10T10:00',
      end_date: '2026-09-10T11:30',
      registration_policy: 'EVENT_REGISTRANTS_ONLY',
    });

    component.saveActivity();

    expect(eventsService.updateActivity).toHaveBeenCalledWith(21, {
      title: 'Abertura atualizada',
      description: 'Boas-vindas',
      type: 'WORKSHOP',
      location: 'Laboratório 04',
      start_date: '2026-09-10T10:00',
      end_date: '2026-09-10T11:30',
      registration_policy: 'EVENT_REGISTRANTS_ONLY',
    });
    expect(component.editingActivityId()).toBeNull();
  });

  it('should confirm the editor inclusion and refresh the team from the API', () => {
    const editor = {
      id: 31,
      event_id: createdEvent.id,
      user_id: 'editor-user',
      name: 'Nova Editora',
      email_address: 'editora@ifma.edu.br',
      status: 'ACTIVE' as const,
      active: true,
    };
    eventsService.getEditors.mockReturnValueOnce(of({ content: [editor], next_cursor: null }));
    component.event.set({ ...createdEvent, owner_id: 'event-owner' });
    component.editorForm.setValue({ email: editor.email_address });

    component.addEditor();

    expect(eventsService.addEditor).toHaveBeenCalledWith(createdEvent.id, editor.email_address);
    expect(eventsService.getEditors).toHaveBeenCalledWith(createdEvent.id);
    expect(component.editors()).toEqual([editor]);
    expect(component.editorForm.controls.email.value).toBe('');
    expect(component.successMessage()).toContain('Editor adicionado');
  });

  it('should keep the email and show an error when the editor inclusion fails', () => {
    eventsService.addEditor.mockReturnValueOnce(throwError(() => new Error('Falha de rede')));
    component.event.set({ ...createdEvent, owner_id: 'event-owner' });
    component.editorForm.setValue({ email: 'editora@ifma.edu.br' });

    component.addEditor();

    expect(component.editorForm.controls.email.value).toBe('editora@ifma.edu.br');
    expect(component.errorMessage()).toContain('Não foi possível adicionar o editor');
  });

  it('should publish the event and show the success confirmation in the final review step', () => {
    component.form.setValue({
      title: createdEvent.title,
      category: createdEvent.category,
      format: createdEvent.format,
      start_date: '2026-09-10T08:00',
      end_date: '2026-09-10T18:00',
      enrollment_start_date: '',
      enrollment_end_date: '',
      enrollment_paused: false,
    });

    component.save();
    component.presentationForm.setValue({
      summary: 'Palestras e oficinas para a comunidade.',
      content: 'Uma programação completa com atividades para estudantes.',
      cover_image_url: '',
    });
    component.savePresentation();
    component.continueFromSchedule();
    component.continueFromTeam();

    expect(component.activeStep()).toBe('review');
    expect(component.successMessage()).toBeNull();

    component.completeCreation();

    expect(component.creationCompleted()).toBe(true);
    expect(eventsService.publish).toHaveBeenCalledWith(createdEvent.id);
    expect(component.successMessage()).toContain('Evento publicado com sucesso');
    expect(router.navigate).toHaveBeenCalledWith(['/eventos', createdEvent.id], {
      state: { eventFeedback: expect.stringContaining('Evento publicado com sucesso') },
    });
  });

  it('should not allow jumping ahead before the prior stage is completed', () => {
    component.selectStep('review');

    expect(component.activeStep()).toBe('details');
    expect(component.errorMessage()).toContain('Avance pelas etapas');
  });

  it('shows every event day, including empty days, and opens a time-only modal on the selected day', () => {
    component.event.set({ ...createdEvent, owner_id: 'event-owner', end_date: '2026-09-12T18:00:00' });
    component.activeStep.set('schedule');
    component.selectActivityDay('2026-09-11');
    fixture.detectChanges();
    expect(component.activitySchedule().map((day) => day.key)).toEqual(['2026-09-10', '2026-09-11', '2026-09-12']);
    expect(fixture.nativeElement.querySelector('.editor-card .activity-editor-form')).toBeNull();
    const button = fixture.nativeElement.querySelector('.schedule-day-toolbar button') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    expect(component.activityDialogDay()).toBe('2026-09-11');
    expect(dialog.querySelectorAll('input[type="time"]')).toHaveLength(2);
    expect(dialog.querySelector('input[type="datetime-local"]')).toBeNull();
    expect(component.activityTimeBounds('2026-09-10')).toEqual({ min: '08:00', max: '23:59' });
    expect(component.activityTimeBounds('2026-09-11')).toEqual({ min: '00:00', max: '23:59' });
    expect(component.activityTimeBounds('2026-09-12')).toEqual({ min: '00:00', max: '18:00' });
  });

  it('combines the chosen day with time inputs and closes only after successful persistence', () => {
    component.event.set({ ...createdEvent, owner_id: 'event-owner' });
    component.openActivityDialog();
    component.activityForm.patchValue({ title: 'Oficina', location: 'Lab 1' });
    const setTime = (field: 'start_date' | 'end_date', value: string) => {
      const input = document.createElement('input');
      input.value = value;
      component.setActivityTime(field, { target: input } as unknown as Event);
    };
    setTime('start_date', '07:00');
    setTime('end_date', '09:00');
    component.saveActivity();
    expect(eventsService.createActivity).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('dialog').open).toBe(true);
    setTime('start_date', '08:00');
    component.saveActivity();
    expect(eventsService.updateActivity).toHaveBeenCalledWith(21, expect.objectContaining({
      start_date: '2026-09-10T08:00', end_date: '2026-09-10T09:00',
    }));
    expect(fixture.nativeElement.querySelector('dialog').open).toBe(false);
  });

  it('keeps the modal open and displays errors when saving fails', () => {
    component.event.set({ ...createdEvent, owner_id: 'event-owner' });
    component.openActivityDialog();
    component.activityForm.setValue(activityPayload);
    eventsService.updateActivity.mockReturnValueOnce(throwError(() => new Error('Network error')));
    component.saveActivity();
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    expect(dialog.querySelector('[role="alert"]')?.textContent).toContain('Não foi possível');
    expect(component.activityForm.getRawValue()).toEqual(activityPayload);
  });

  it('counts simultaneous activities individually and preserves multi-day activities when editing', () => {
    component.event.set({ ...createdEvent, owner_id: 'event-owner', end_date: '2026-09-12T18:00:00' });
    const first = { id: 1, event_id: 14, ...activityPayload, end_date: '2026-09-11T09:00' };
    component.activities.set([first, { ...first, id: 2 }]);
    expect(component.activitySchedule()[0].count).toBe(2);
    component.editActivity(first);
    expect(component.activityDialogDay()).toBe('2026-09-10');
    expect(component.activityDialogEndDay()).toBe('2026-09-11');
    expect(component.activityForm.controls.end_date.value).toBe('2026-09-11T09:00');
  });

  it('does not open the activity modal for viewers or days outside the event', () => {
    component.event.set(createdEvent);
    component.openActivityDialog();
    expect(fixture.nativeElement.querySelector('dialog').open).toBe(false);
    expect(component.canAddActivityOnDay('2026-09-09')).toBe(false);
    expect(component.canAddActivityOnDay('2026-09-11')).toBe(false);
  });

  it('ends the loading screen when loading an existing event fails', () => {
    Object.assign(TestBed.inject(ActivatedRoute).snapshot, { paramMap: convertToParamMap({ id: 14 }) });
    eventsService.getById.mockReturnValueOnce(throwError(() => new Error('Network failure')));
    component.ngOnInit();
    fixture.detectChanges();
    expect(component.operation()).toBe('idle');
    expect(component.editorAccessResolved()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Tentar novamente');
    expect(fixture.nativeElement.textContent).not.toContain('Carregando informações do evento');
  });
});
