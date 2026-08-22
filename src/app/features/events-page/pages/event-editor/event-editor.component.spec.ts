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
    getEditors: vi.fn(() => of({ content: [], next_cursor: null })),
    deleteEvent: vi.fn(() => of(void 0)),
    createActivity: vi.fn(),
    deleteActivity: vi.fn(),
    addEditor: vi.fn(),
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

  it('should create the event with the camelCase contract and advance to the schedule step', () => {
    component.form.setValue({
      title: createdEvent.title,
      description: 'Palestras, oficinas e oportunidades para a comunidade.',
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
      startDate: '2026-09-10T08:00',
      endDate: '2026-09-10T18:00',
    });
    expect(component.event()?.id).toBe(createdEvent.id);
    expect(component.activeStep()).toBe('schedule');
  });
});
