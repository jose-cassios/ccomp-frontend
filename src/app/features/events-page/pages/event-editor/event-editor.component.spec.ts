import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../auth/services/auth.service';
import { EventDetails } from '../../models/event.model';
import { EventsService } from '../../services/events.service';
import { EventEditorComponent } from './event-editor.component';

describe('EventEditorComponent', () => {
  let component: EventEditorComponent;
  let fixture: ComponentFixture<EventEditorComponent>;

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
    getCreatedEvents: vi.fn(() => of([])),
    create: vi.fn(() => of(createdEvent)),
    update: vi.fn(() => of(createdEvent)),
    getById: vi.fn(() => of(createdEvent)),
    getActivities: vi.fn(() => of({ content: [], next_cursor: null })),
    getEditors: vi.fn(() => of({ content: [], next_cursor: null })),
    deleteEvent: vi.fn(() => of(void 0)),
    createActivity: vi.fn(() => of({ id: 21, event_id: createdEvent.id, title: 'Abertura', description: null })),
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
        { provide: AuthService, useValue: { hasAnyRole: () => false } },
        { provide: EventsService, useValue: eventsService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EventEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the event with only the required API fields and advance to the presentation step', () => {
    component.form.setValue({
      title: createdEvent.title,
      category: createdEvent.category,
      format: createdEvent.format,
      start_date: '2026-09-10T08:00',
      end_date: '2026-09-10T18:00',
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

  it('should send page details through PATCH /events/{eventId}', () => {
    component.form.setValue({
      title: createdEvent.title,
      category: createdEvent.category,
      format: createdEvent.format,
      start_date: '2026-09-10T08:00',
      end_date: '2026-09-10T18:00',
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
    });
  });

  it('should persist an activity and refresh the saved schedule', () => {
    component.form.setValue({
      title: createdEvent.title,
      category: createdEvent.category,
      format: createdEvent.format,
      start_date: '2026-09-10T08:00',
      end_date: '2026-09-10T18:00',
    });
    component.save();
    component.activityForm.setValue({ title: 'Abertura', description: '' });

    component.saveActivity();

    expect(eventsService.createActivity).toHaveBeenCalledWith(createdEvent.id, { title: 'Abertura', description: '' });
    expect(eventsService.getActivities).toHaveBeenCalledWith(createdEvent.id);
  });

  it('should reserve the success confirmation for the final review step', () => {
    component.form.setValue({
      title: createdEvent.title,
      category: createdEvent.category,
      format: createdEvent.format,
      start_date: '2026-09-10T08:00',
      end_date: '2026-09-10T18:00',
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
    expect(component.successMessage()).toContain('Evento criado com sucesso');
  });

  it('should not allow jumping ahead before the prior stage is completed', () => {
    component.selectStep('review');

    expect(component.activeStep()).toBe('details');
    expect(component.errorMessage()).toContain('Avance pelas etapas');
  });
});
