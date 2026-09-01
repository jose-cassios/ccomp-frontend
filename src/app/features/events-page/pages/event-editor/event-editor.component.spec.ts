import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../auth/services/auth.service';
import { EventDetails } from '../../models/event.model';
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
    getActivities: vi.fn(() => of({ content: [], next_cursor: null })),
    getEditors: vi.fn(() => of({ content: [], next_cursor: null })),
    deleteEvent: vi.fn(() => of(void 0)),
    createActivity: vi.fn(() => of({ id: 21, event_id: createdEvent.id, title: 'Abertura', description: null })),
    updateActivity: vi.fn(() => of({ id: 21, event_id: createdEvent.id, title: 'Abertura atualizada', description: 'Boas-vindas' })),
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
        { provide: AuthService, useValue: { hasAnyRole: () => false, currentUserState: () => null } },
        { provide: EventsService, useValue: eventsService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EventEditorComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
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
    component.activityForm.setValue({ title: 'Abertura', description: '' });

    component.saveActivity();

    expect(eventsService.createActivity).toHaveBeenCalledWith(createdEvent.id, { title: 'Abertura', description: '' });
    expect(eventsService.getActivities).toHaveBeenCalledWith(createdEvent.id);
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
    component.activityForm.setValue({ title: 'Abertura atualizada', description: 'Boas-vindas' });

    component.saveActivity();

    expect(eventsService.updateActivity).toHaveBeenCalledWith(21, {
      title: 'Abertura atualizada',
      description: 'Boas-vindas',
    });
    expect(component.editingActivityId()).toBeNull();
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
});
