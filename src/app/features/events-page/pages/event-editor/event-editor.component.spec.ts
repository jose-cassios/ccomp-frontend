import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../auth/services/auth.service';
import { EventDetails, EventEditor } from '../../models/event.model';
import { EventsService } from '../../services/events.service';
import { EventEditorComponent } from './event-editor.component';
import { EventGuestsService } from '../../services/event-guests.service';
import { ActivityInstructorsService } from '../../services/activity-instructors.service';

describe('EventEditorComponent', () => {
  let component: EventEditorComponent;
  let fixture: ComponentFixture<EventEditorComponent>;
  let router: Router;
  const guests = { guests: vi.fn(() => of({ content: [], next_cursor: null })), invitations: vi.fn(() => of({ content: [], next_cursor: null })), associate: vi.fn(() => of(void 0)) };
  const instructors = { invitations: vi.fn(() => of([])), invite: vi.fn(() => of({ message: 'Convite enviado.' })), cancel: vi.fn(() => of({})) };

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
    uploadCover: vi.fn(() => of({ message: 'Enviada' })),
    removeCover: vi.fn(() => of(void 0)),
    coverUrl: (id: number) => `http://localhost:8080/api/events/${id}/images/cover`,
    create: vi.fn(() => of(createdEvent)),
    update: vi.fn((_eventId: number, payload: { enrollment_start_date?: string; enrollment_end_date?: string; enrollment_paused?: boolean }) => of({
      ...createdEvent,
      enrollment_start_date: payload.enrollment_start_date ?? null,
      enrollment_end_date: payload.enrollment_end_date ?? null,
      enrollment_paused: payload.enrollment_paused ?? false,
    })),
    publish: vi.fn(() => of({ ...createdEvent, status: 'PUBLISHED' as const })),
    getById: vi.fn(() => of(createdEvent)),
    getEditableEvents: vi.fn(() => of({ content: [], next_cursor: null })),
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
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [EventEditorComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({}) } } },
        { provide: AuthService, useValue: { hasAnyRole: () => false, currentUserState: () => ({ id: 'event-owner' }) } },
        { provide: EventsService, useValue: eventsService },
        { provide: ActivityInstructorsService, useValue: instructors },
        { provide: EventGuestsService, useValue: guests },
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

  it('keeps values and disclosure state when panels are collapsed or steps change', () => {
    const panel = fixture.nativeElement.querySelector('#event-dates') as HTMLDetailsElement;
    const input = panel.querySelector('input')!;
    panel.open = true; panel.dispatchEvent(new Event('toggle'));
    component.form.controls.start_date.setValue('2026-09-10T08:00');
    fixture.detectChanges();
    panel.open = false; panel.dispatchEvent(new Event('toggle'));
    fixture.detectChanges();
    expect(panel.querySelector('input')).toBe(input);
    expect(input.value).toBe('2026-09-10T08:00');
    component.activeStep.set('presentation'); fixture.detectChanges();
    component.activeStep.set('details'); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#event-dates').open).toBe(false);
    expect(component.form.controls.start_date.value).toBe('2026-09-10T08:00');
  });

  it('opens registration settings instead of hiding validation errors in a collapsed panel', () => {
    component.form.patchValue({ title: createdEvent.title, start_date: '2026-09-10T08:00', end_date: '2026-09-10T18:00' });
    component.save(); fixture.detectChanges();
    expect(eventsService.create).not.toHaveBeenCalled();
    expect(component.activeStep()).toBe('details');
    expect(fixture.nativeElement.querySelector('#event-registration').open).toBe(true);
    expect(component.errorMessage()).toBeTruthy();
  });

  it('takes invalid presentation content back to its expanded section from final review', () => {
    component.event.set({ ...createdEvent, owner_id: 'event-owner' });
    component.form.patchValue({ title: createdEvent.title, start_date: '2026-09-10T08:00', end_date: '2026-09-10T18:00' });
    component.selectEventRegistrationPolicy('OPEN_ACCESS');
    component.presentationForm.controls.summary.setValue('x');
    component.activeStep.set('review'); fixture.detectChanges();
    component.completeCreation(); fixture.detectChanges();
    expect(component.activeStep()).toBe('presentation');
    expect(fixture.nativeElement.querySelector('#page-content').open).toBe(true);
    expect(eventsService.update).not.toHaveBeenCalled();
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
    component.selectEventRegistrationPolicy('OPEN_ACCESS');

    component.save();

    expect(eventsService.create).toHaveBeenCalledWith({
      time_zone: 'America/Sao_Paulo',
      time_zone: 'America/Sao_Paulo',
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
    component.selectEventRegistrationPolicy('OPEN_ACCESS');

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
      time_zone: 'America/Sao_Paulo',
      time_zone: 'America/Sao_Paulo',
      title: createdEvent.title,
      summary: 'Palestras e oficinas para a comunidade.',
      content: 'Uma programação completa com atividades para estudantes.',
      category: createdEvent.category,
      format: createdEvent.format,
      start_date: '2026-09-10T08:00',
      end_date: '2026-09-10T18:00',
      enrollment_start_date: '2026-08-10T08:00',
      enrollment_end_date: '2026-09-09T18:00',
      enrollment_paused: false,
    });
  });

  it('uploads and associates a cover using the event endpoint', () => {
    const image = new File(['cover'], 'capa.png', { type: 'image/png' });
    const input = { files: [image], value: 'capa.png' } as unknown as HTMLInputElement;
    component.event.set(createdEvent);

    component.uploadCover({ target: input } as unknown as Event);

    expect(eventsService.uploadCover).toHaveBeenCalledWith(createdEvent.id, image);
    expect(component.presentationForm.controls.cover_image_url.value).toContain('/events/14/images/cover?v=');
    expect(component.successMessage()).toContain('Imagem enviada');
    expect(component.uploadingCover()).toBe(false);
  });

  it('does not upload a non-image as an event cover', () => {
    const file = new File(['text'], 'notas.txt', { type: 'text/plain' });
    const input = { files: [file], value: 'notas.txt' } as unknown as HTMLInputElement;

    component.uploadCover({ target: input } as unknown as Event);

    expect(eventsService.uploadCover).not.toHaveBeenCalled();
    expect(component.errorMessage()).toContain('arquivo de imagem');
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
    component.selectEventRegistrationPolicy('OPEN_ACCESS');
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
    expect(eventsService.updateActivity).toHaveBeenCalledWith(21, { ...activityPayload, workload_hours: 1 });
    expect(eventsService.updateActivity).toHaveBeenCalledWith(21, { ...activityPayload, workload_hours: 1 });
    expect(eventsService.getAllActivities).toHaveBeenCalledWith(createdEvent.id);
    expect(component.successMessage()).toContain('adicionada');
  });

  it('allows an activity to be saved without a location', () => {
    component.event.set({ ...createdEvent, owner_id: 'event-owner' });
    component.ownedEventIds.set(new Set([createdEvent.id]));
    component.activityForm.setValue({ ...activityPayload, location: '' });

    component.saveActivity();

    expect(eventsService.updateActivity).toHaveBeenCalledWith(21, expect.objectContaining({ location: '' }));
    expect(component.errorMessage()).toBeNull();
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
    expect(eventsService.updateActivity).toHaveBeenLastCalledWith(22, { ...activityPayload, workload_hours: 1 });
    expect(eventsService.updateActivity).toHaveBeenLastCalledWith(22, { ...activityPayload, workload_hours: 1 });
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
    component.selectEventRegistrationPolicy('OPEN_ACCESS');
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
      registration_policy: 'ACTIVITY_REGISTRANTS_ONLY',
    });

    component.saveActivity();

    expect(eventsService.updateActivity).toHaveBeenCalledWith(21, {
      workload_hours: 1.5,
      workload_hours: 1.5,
      title: 'Abertura atualizada',
      description: 'Boas-vindas',
      type: 'WORKSHOP',
      location: 'Laboratório 04',
      start_date: '2026-09-10T10:00',
      end_date: '2026-09-10T11:30',
      registration_policy: 'ACTIVITY_REGISTRANTS_ONLY',
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

  it('completes creation as a draft and publishes only through the explicit publish action', () => {
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
    component.selectEventRegistrationPolicy('OPEN_ACCESS');

    component.save();
    component.presentationForm.setValue({
      summary: 'Palestras e oficinas para a comunidade.',
      content: 'Uma programação completa com atividades para estudantes.',
      cover_image_url: '',
    });
    component.savePresentation();
    expect(component.activeStep()).toBe('team');
    component.continueFromTeam();
    expect(component.activeStep()).toBe('schedule');
    component.continueFromSchedule();

    expect(component.activeStep()).toBe('review');
    expect(component.successMessage()).toBeNull();

    component.completeCreation();

    expect(component.creationCompleted()).toBe(true);
    expect(eventsService.publish).not.toHaveBeenCalled();
    expect(eventsService.update.mock.calls.at(-1)?.[1]).not.toHaveProperty('status');
    expect(component.successMessage()).toContain('rascunho');
    expect(router.navigate).toHaveBeenCalledWith(['/eventos', createdEvent.id], {
      state: { eventFeedback: expect.stringContaining('rascunho') },
    });
    component.publish();
    expect(eventsService.publish).toHaveBeenCalledWith(createdEvent.id);
    expect(component.event()?.status).toBe('PUBLISHED');
  });

  it('should not allow jumping ahead before the prior stage is completed', () => {
    component.selectStep('review');

    expect(component.activeStep()).toBe('details');
    expect(component.errorMessage()).toContain('Avance pelas etapas');
  });

  it('uses the private event-and-activity flow by default and exposes clear participation choices', () => {
    expect(component.eventRegistrationPolicy()).toBe('REGISTRATION_REQUIRED');
    expect(component.enrollmentDatesError()).toContain('Defina a abertura');
    expect(component.activityForm.controls.registration_policy.value).toBe('ACTIVITY_REGISTRANTS_ONLY');
    component.openActivityDialog();
    component.toggleActivityPolicyMenu();
    fixture.detectChanges();
    const options = Array.from(fixture.nativeElement.querySelectorAll('[role="option"]')) as HTMLElement[];
    expect(options.map((option) => option.textContent)).toEqual(expect.arrayContaining([
      expect.stringContaining('Atividade aberta, sem inscrição'),
      expect.stringContaining('Inscrição no evento e na atividade'),
      expect.stringContaining('Programação incluída no evento'),
    ]));
    expect(fixture.nativeElement.querySelector('select[formControlName="registration_policy"]')).toBeNull();
    options[2].click();
    expect(component.activityForm.controls.registration_policy.value).toBe('INHERITED_FROM_EVENT');
    expect(component.activityPolicyMenuOpen()).toBe(false);
  });

  it('allows a new event to use open access without retaining registration dates', () => {
    component.form.patchValue({
      enrollment_start_date: '2026-08-10T08:00',
      enrollment_end_date: '2026-09-09T18:00',
      enrollment_paused: true,
    });

    component.selectEventRegistrationPolicy('OPEN_ACCESS');

    expect(component.eventRegistrationRequired()).toBe(false);
    expect(component.form.controls.enrollment_start_date.value).toBe('');
    expect(component.form.controls.enrollment_end_date.value).toBe('');
    expect(component.form.controls.enrollment_paused.value).toBe(false);
    expect(component.enrollmentDatesError()).toBeNull();
  });

  it('does not pretend to remove a saved enrollment window when the API cannot clear it', () => {
    component.event.set({
      ...createdEvent,
      enrollment_start_date: '2026-08-10T08:00:00',
      enrollment_end_date: '2026-09-09T18:00:00',
    });
    component.editingExisting.set(true);

    component.selectEventRegistrationPolicy('OPEN_ACCESS');

    expect(component.eventRegistrationRequired()).toBe(true);
    expect(component.errorMessage()).toContain('não permite remover');
  });

  it('uses prevention as the default simultaneous-registration policy without a placeholder option', () => {
    component.event.set({ ...createdEvent, owner_id: 'event-owner' });
    component.ownedEventIds.set(new Set([createdEvent.id]));
    component.activeStep.set('schedule');
    fixture.detectChanges();

    const selects = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('select')) as HTMLSelectElement[];
    const select = selects
      .find((element) => Array.from(element.options)
        .some((option) => option.value === 'PREVENT')) as HTMLSelectElement;
    expect(component.conflictPolicy.value).toBe('PREVENT');
    expect(Array.from(select.options).map((option) => option.value)).toEqual(['PREVENT', 'ALLOW']);
    expect(fixture.nativeElement.textContent).not.toContain('Manter configuraÃ§Ã£o atual');
  });

  it('places guest registration before the schedule and keeps it out of the activity dialog', () => {
    component.event.set({ ...createdEvent, owner_id: 'event-owner' });
    component.activeStep.set('team');
    fixture.detectChanges();

    const team = fixture.nativeElement.querySelector('[aria-labelledby="team-title"]') as HTMLElement;
    expect(team.textContent).toContain('moderadores');
    expect(team.querySelector('app-event-guest-manager')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('dialog app-event-guest-manager')).toBeNull();
    expect(component.steps.map(step => step.value)).toEqual(['details', 'presentation', 'team', 'schedule', 'review']);
  });

  it('moves enrollments to the team step and limits manual additions to moderators', () => {
    vi.spyOn(TestBed.inject(AuthService), 'hasAnyRole').mockImplementation(roles => roles.includes('MODERATOR'));
    component.activeStep.set('team'); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#enrollments-title')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#manual-enrollment-title')).not.toBeNull();
    component.manualEnrollmentForm.controls.email.setValue('late@example.com');
    component.requestManualEnrollment();
    expect(component.errorMessage()).toContain('Nenhum participante foi adicionado');
    expect(component.enrollments()).toEqual([]);
    component.activeStep.set('review'); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#enrollments-title')).toBeNull();
  });

  for (const role of ['ADM', 'MODERATOR']) it('allows ' + role + ' to manage an event owned by someone else', () => {
    vi.spyOn(TestBed.inject(AuthService), 'hasAnyRole').mockImplementation(roles => roles.includes(role));
    component.event.set({ ...createdEvent, owner_id: 'another-owner' });
    component.activityForm.patchValue(activityPayload);
    expect(component.isOwner()).toBe(false);
    expect(component.canEditEvent()).toBe(true);
    expect(component.canManageActivities()).toBe(true);
    component.saveActivity(true);
    expect(eventsService.createActivity).toHaveBeenCalled();
    expect(component.editingActivityId()).toBe(21);
  });

  it('denies activity changes for an unrelated user', () => {
    component.event.set({ ...createdEvent, owner_id: 'another-owner' });
    component.activityForm.patchValue(activityPayload);
    expect(component.canManageActivities()).toBe(false);
    component.saveActivity();
    expect(eventsService.createActivity).not.toHaveBeenCalled();
  });

  it('preserves activity data while adding people in the preceding step', () => {
    component.event.set({ ...createdEvent, owner_id: 'event-owner' });
    component.activeStep.set('schedule');
    component.openActivityDialog();
    component.activityForm.patchValue(activityPayload);
    component.activityForm.markAsDirty();
    component.addMorePeople('instructors');
    expect(component.sectionOpen('team-instructors')).toBe(true);
    expect(component.activeStep()).toBe('team');
    expect(fixture.nativeElement.querySelector('dialog').open).toBe(false);
    component.rosterForm.setValue({ name: 'Ana', email: 'ana@ifma.edu.br' });
    component.addRosterInstructor();
    expect(instructors.invite).not.toHaveBeenCalled();
    component.continueFromTeam();
    expect(component.activeStep()).toBe('schedule');
    expect(fixture.nativeElement.querySelector('dialog').open).toBe(true);
    expect(component.activityForm.getRawValue()).toEqual(activityPayload);
    expect(component.instructorRoster()).toContainEqual({ name: 'Ana', email: 'ana@ifma.edu.br' });
  });

  it('links selected people after saving and retries failed links without creating duplicate activities', () => {
    component.event.set({ ...createdEvent, owner_id: 'event-owner' });
    component.openActivityDialog();
    component.activityForm.patchValue(activityPayload);
    component.activityGuestId.setValue(9);
    component.instructorForm.controls.email.setValue('aluno@ifma.edu.br');
    instructors.invite.mockReturnValueOnce(throwError(() => new Error('offline')));
    component.saveActivity();
    expect(guests.associate).toHaveBeenCalledWith(14, 9, 21, 'PRESENTER');
    expect(component.editingActivityId()).toBe(21);
    expect(component.activityGuestId.value).toBe(0);
    expect(component.instructorForm.controls.email.value).toBe('aluno@ifma.edu.br');
    expect(component.peopleError()).toContain('A atividade foi salva');
    expect(fixture.nativeElement.querySelector('dialog').open).toBe(true);
    component.saveActivity();
    expect(eventsService.createActivity).toHaveBeenCalledTimes(1);
    expect(guests.associate).toHaveBeenCalledTimes(1);
    expect(instructors.invite).toHaveBeenLastCalledWith(21, 'aluno@ifma.edu.br');
    expect(component.peopleBusy()).toBe(false);
    expect(fixture.nativeElement.querySelector('dialog').open).toBe(false);
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

  it('associates a guest and invites an instructor separately when saving an activity', () => {
    component.event.set({ ...createdEvent, owner_id: 'event-owner' });
    component.openActivityDialog(); component.activityForm.patchValue(activityPayload);
    component.activityGuestId.setValue(9);
    component.activityGuestRole.setValue('PRESENTER');
    component.instructorForm.controls.email.setValue('ana@ifma.edu.br');
    component.saveActivity();
    expect(guests.associate).toHaveBeenCalledWith(14, 9, 21, 'PRESENTER');
    expect(instructors.invite).toHaveBeenCalledWith(21, 'ana@ifma.edu.br');
  });
  it('keeps a failed instructor invitation selected for retry without duplicating the activity', () => {
    component.event.set({ ...createdEvent, owner_id: 'event-owner' });
    component.openActivityDialog(); component.activityForm.patchValue(activityPayload);
    component.instructorForm.controls.email.setValue('ana@ifma.edu.br');
    instructors.invite.mockReturnValueOnce(throwError(() => new Error('offline')));
    component.saveActivity();
    expect(component.instructorForm.controls.email.value).toBe('ana@ifma.edu.br');
    expect(component.peopleError()).toContain('A atividade foi salva');
    component.saveActivity();
    expect(eventsService.createActivity).toHaveBeenCalledTimes(1);
    expect(instructors.invite).toHaveBeenCalledTimes(2);
    expect(component.instructorForm.controls.email.value).toBe('');
  });
  it('uses explicit workload hours and rejects negative values before saving', () => {
    component.event.set({ ...createdEvent, owner_id: 'event-owner' });
    component.openActivityDialog(); component.activityForm.patchValue(activityPayload);
    component.activityWorkload.setValue(-1); component.saveActivity();
    expect(eventsService.createActivity).not.toHaveBeenCalled();
    component.activityWorkload.setValue(2.5); component.saveActivity();
    expect(eventsService.updateActivity).toHaveBeenCalledWith(21, { ...activityPayload, workload_hours: 2.5 });
  });


  it('validates capacity and includes it when creating an event', () => {
    component.form.patchValue({ title: createdEvent.title, start_date: '2026-09-10T08:00', end_date: '2026-09-10T18:00' });
    component.selectEventRegistrationPolicy('OPEN_ACCESS');
    for (const value of [-1, 1.5]) { component.eventCapacity.setValue(value); component.save(); expect(eventsService.create).not.toHaveBeenCalled(); }
    eventsService.create.mockReturnValueOnce(of({ ...createdEvent, max_capacity: 20 }));
    component.eventCapacity.setValue(20); component.save();
    expect(eventsService.create).toHaveBeenCalledWith(expect.objectContaining({ max_capacity: 20 }));
    expect(component.eventCapacity.value).toBe(20);
    expect(component.activeStep()).toBe('presentation');
  });
  it('retains the created event ID if saving enrollment settings fails', () => {
    component.form.patchValue({ title: createdEvent.title, start_date: '2026-09-10T08:00', end_date: '2026-09-10T18:00', enrollment_start_date: '2026-09-01T08:00', enrollment_end_date: '2026-09-10T08:00' });
    eventsService.update.mockReturnValueOnce(throwError(() => new Error('offline')));
    component.save(); expect(component.event()?.id).toBe(14);
    component.save(); expect(eventsService.create).toHaveBeenCalledTimes(1);
  });
  it('retains an event capacity edit on failure, including removal of the limit', () => {
    component.event.set({ ...createdEvent, owner_id: 'event-owner', max_capacity: 30 });
    component.form.patchValue({ title: createdEvent.title, start_date: '2026-09-10T08:00', end_date: '2026-09-10T18:00' });
    component.selectEventRegistrationPolicy('OPEN_ACCESS'); component.eventCapacity.setValue(null); component.eventCapacity.markAsDirty();
    eventsService.update.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 404, error: { message: 'Limite não atualizado.' } })));
    component.save();
    expect(eventsService.update).toHaveBeenLastCalledWith(14, expect.objectContaining({ max_capacity: null }));
    expect(component.eventCapacity.dirty).toBe(true); expect(component.errorMessage()).toContain('Limite não atualizado');
  });
  it('creates an activity with capacity and restores it on editing', () => {
    component.event.set({ ...createdEvent, owner_id: 'event-owner' }); component.openActivityDialog(); component.activityForm.patchValue(activityPayload);
    component.activityCapacity.setValue(12); component.saveActivity();
    expect(eventsService.createActivity).toHaveBeenCalledWith(14, expect.objectContaining({ max_capacity: 12 }));
    expect(eventsService.updateActivity).toHaveBeenLastCalledWith(21, expect.objectContaining({ max_capacity: 12 }));
    component.editActivity({ id: 21, event_id: 14, ...activityPayload, max_capacity: 12 });
    expect(component.activityCapacity.value).toBe(12);
    component.activityCapacity.setValue(-1); eventsService.updateActivity.mockClear(); component.saveActivity();
    expect(eventsService.updateActivity).not.toHaveBeenCalled();
  });

  it('restores event capacity from the API and clears capacity for a new activity', () => {
    Object.assign(TestBed.inject(ActivatedRoute).snapshot, { paramMap: convertToParamMap({ id: 14 }) });
    eventsService.getById.mockReturnValueOnce(of({ ...createdEvent, owner_id: 'event-owner', max_capacity: 25 }));
    component.ngOnInit();
    expect(component.eventCapacity.value).toBe(25);
    expect(component.eventCapacity.pristine).toBe(true);
    component.editActivity({ id: 21, event_id: 14, ...activityPayload, max_capacity: 12 });
    component.openActivityDialog();
    expect(component.activityCapacity.value).toBeNull();
  });

});
