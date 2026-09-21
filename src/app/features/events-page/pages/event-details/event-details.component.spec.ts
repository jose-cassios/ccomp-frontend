import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../auth/services/auth.service';
import { EventActivity, EventDetails } from '../../models/event.model';
import { EventsService } from '../../services/events.service';
import { EventDetailsComponent } from './event-details.component';
import { EventGuestsService } from '../../services/event-guests.service';

describe('EventDetailsComponent', () => {
  let fixture: ComponentFixture<EventDetailsComponent>;
  let component: EventDetailsComponent;

  const authenticated = signal(false);
  const scheduleActivity: EventActivity = {
    id: 3,
    event_id: 7,
    title: 'Abertura',
    description: null,
    type: 'LECTURE',
    location: 'Auditório',
    start_date: '2026-09-12T14:00:00',
    end_date: '2026-09-12T15:00:00',
    registration_mode: 'NONE',
    access_requirement: 'PUBLIC',
    guest: { name: 'Ana Silva', image_url: 'https://example.com/ana.jpg' },
  };
  const event: EventDetails = {
    id: 7,
    title: 'Encontro de Pesquisa',
    slug: 'encontro-de-pesquisa',
    summary: 'Apresentação de projetos e oportunidades de pesquisa.',
    content: 'Descrição completa da programação, das atividades e das informações para participação.',
    description: 'Descrição completa da programação, das atividades e das informações para participação.',
    cover_image_url: 'https://example.com/pesquisa.jpg',
    format: 'IN_PERSON',
    category: 'ACADEMIC_EDUCATIONAL',
    start_date: '2026-09-12T14:00:00',
    end_date: '2026-09-12T18:00:00',
    activities: [],
  };
  const eventsService = {
    getById: vi.fn(() => of(event)),
    getAllActivities: vi.fn(() => of([scheduleActivity])),
    getMyActivitySubscriptions: vi.fn(() => of([] as EventActivity[])),
    getActivityConflicts: vi.fn(() => of([] as EventActivity[])),
    subscribeActivity: vi.fn(() => of({ message: 'Inscrição confirmada.' })),
    unsubscribeActivity: vi.fn(() => of({ message: 'Inscrição cancelada.' })),
    subscribe: vi.fn(() => of({ message: 'Inscrição no evento confirmada.' })),
    unsubscribe: vi.fn(() => of({ message: 'Inscrição no evento cancelada.' })),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    authenticated.set(false);
    await TestBed.configureTestingModule({
      imports: [EventDetailsComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: event.id }) } } },
        {
          provide: AuthService,
          useValue: { isAuthenticatedState: authenticated, hasAnyRole: () => false, getCurrentUser: () => null },
        },
        { provide: EventsService, useValue: eventsService },
        { provide: EventGuestsService, useValue: { guests: () => of({ content: [], next_cursor: null }) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EventDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should use the summary in the hero and keep the full content in the presentation', () => {
    expect(fixture.nativeElement.querySelector('.event-summary')?.textContent).toContain(event.summary);
    expect(fixture.nativeElement.querySelector('.event-description')?.textContent).toContain(event.content);
  });

  it('should render the event cover image', () => {
    const cover = fixture.nativeElement.querySelector('.event-hero__cover') as HTMLImageElement;
    expect(cover.src).toBe('https://example.com/pesquisa.jpg');
  });

  it('restores activity subscriptions from the dedicated endpoint', () => {
    authenticated.set(true);
    eventsService.getMyActivitySubscriptions.mockReturnValueOnce(of([scheduleActivity]));
    component.reloadActivitySubscriptions();
    expect(component.event()?.activities?.[0].subscribed).toBe(true);
    expect(component.activitySubscriptionsLoading()).toBe(false);
  });

  it('blocks new reservations when the subscription lookup fails and allows retry', () => {
    authenticated.set(true);
    eventsService.getMyActivitySubscriptions.mockReturnValueOnce(throwError(() => new HttpErrorResponse({status: 500})));
    component.reloadActivitySubscriptions();
    expect(component.activitySubscriptionsError()).toBeTruthy();
    expect(component.activityRegistrationBlocked(scheduleActivity)).toBe(true);
    component.reloadActivitySubscriptions();
    expect(component.activitySubscriptionsError()).toBeNull();
  });

  it('checks server-side conflicts before subscribing, including another event', () => {
    authenticated.set(true);
    const activity = { ...scheduleActivity, registration_policy: 'ACTIVITY_REGISTRANTS_ONLY' as const };
    eventsService.getActivityConflicts.mockReturnValueOnce(of([{ ...activity, id: 99, event_id: 100, title: 'Outro evento' }]));
    component.toggleActivitySubscription(activity);
    expect(eventsService.subscribeActivity).not.toHaveBeenCalled();
    expect(component.errorMessage()).toContain('Outro evento');
    expect(component.activitySubscriptionBusyId()).toBeNull();
  });

  it('should load the compact schedule with location and guest', () => {
    expect(fixture.nativeElement.textContent).toContain('Abertura');
    expect(fixture.nativeElement.textContent).toContain('Auditório');
    expect(fixture.nativeElement.textContent).toContain('Ana Silva');
    expect(fixture.nativeElement.textContent).toContain('Participação livre');
  });

  it('should subscribe to an activity independently from the event subscription', () => {
    const activity: EventActivity = {
      ...scheduleActivity,
      registration_mode: 'REQUIRED',
      subscribed: false,
      can_subscribe: true,
    };
    authenticated.set(true);
    component.event.set({ ...event, activities: [activity] });
    component.subscribed.set(true);

    component.toggleActivitySubscription(activity);

    expect(eventsService.subscribeActivity).toHaveBeenCalledWith(activity.id);
    expect(component.event()?.activities?.[0].subscribed).toBe(true);
    expect(component.subscribed()).toBe(true);
    expect(component.successMessage()).toContain('Inscrição confirmada');
  });

  it('blocks a second overlapping activity and identifies the conflicting reservation', () => {
    const reserved: EventActivity = {
      ...scheduleActivity,
      id: 30,
      title: 'Palestra de abertura',
      registration_policy: 'ACTIVITY_REGISTRANTS_ONLY',
      subscribed: true,
    };
    const conflicting: EventActivity = {
      ...scheduleActivity,
      id: 31,
      title: 'Oficina simultânea',
      registration_policy: 'ACTIVITY_REGISTRANTS_ONLY',
      start_date: '2026-09-12T14:30:00',
      end_date: '2026-09-12T16:00:00',
      subscribed: false,
    };
    authenticated.set(true);
    component.event.set({ ...event, activities: [reserved, conflicting] });
    component.subscribed.set(true);

    expect(component.activityConflict(conflicting)).toEqual(reserved);
    expect(component.activityRegistrationBlocked(conflicting)).toBe(true);
    expect(component.activityRegistrationHint(conflicting)).toContain('Palestra de abertura');
    component.toggleActivitySubscription(conflicting);
    expect(eventsService.subscribeActivity).not.toHaveBeenCalled();
    expect(component.errorMessage()).toContain('Conflito de horário');
  });

  it('allows enrollment in an activity that begins when the existing one ends', () => {
    const reserved: EventActivity = {
      ...scheduleActivity,
      id: 30,
      registration_policy: 'ACTIVITY_REGISTRANTS_ONLY',
      subscribed: true,
    };
    const next: EventActivity = {
      ...scheduleActivity,
      id: 31,
      registration_policy: 'ACTIVITY_REGISTRANTS_ONLY',
      start_date: '2026-09-12T15:00:00',
      end_date: '2026-09-12T16:00:00',
      subscribed: false,
    };
    authenticated.set(true);
    component.event.set({ ...event, activities: [reserved, next] });
    component.subscribed.set(true);
    component.toggleActivitySubscription(next);
    expect(eventsService.subscribeActivity).toHaveBeenCalledWith(next.id);
  });

  it('does not send an enrollment request for PUBLIC activities', () => {
    const activity = { ...scheduleActivity, registration_policy: 'PUBLIC' as const, registration_mode: 'REQUIRED' as const };
    authenticated.set(true);
    component.toggleActivitySubscription(activity);
    expect(eventsService.subscribeActivity).not.toHaveBeenCalled();
  });

  it('treats inherited activities as included in the event instead of offering an extra reservation', () => {
    const activity = { ...scheduleActivity, registration_policy: 'INHERITED_FROM_EVENT' as const, subscribed: false };
    authenticated.set(true);
    component.event.set({ ...event, enrollment_status: 'OPEN', activities: [activity] });
    component.subscribed.set(false);
    expect(component.activityRequiresRegistration(activity)).toBe(false);
    expect(component.activityParticipationMessage(activity)).toContain('automaticamente');
    component.toggleActivitySubscription(activity);
    expect(eventsService.subscribeActivity).not.toHaveBeenCalled();
    component.toggleSubscription();
    expect(eventsService.subscribe).toHaveBeenCalledWith(event.id);
    expect(component.event()?.activities?.[0].subscribed).toBe(true);
    expect(component.activityParticipationMessage(activity)).toContain('sua inscrição');
  });

  it('requires event registration for nonpublic policies as enforced by the current API', () => {
    authenticated.set(true);
    component.subscriptionStateResolved.set(true);
    component.subscribed.set(false);
    const activity = { ...scheduleActivity, registration_policy: 'ACTIVITY_REGISTRANTS_ONLY' as const };
    component.toggleActivitySubscription(activity);
    expect(eventsService.subscribeActivity).not.toHaveBeenCalled();
    expect(component.errorMessage()).toContain('primeiro no evento');
  });

  it('allows cancellation without inventing enrollment status after reload', () => {
    const activity = { ...scheduleActivity, registration_policy: 'ACTIVITY_REGISTRANTS_ONLY' as const };
    authenticated.set(true);
    component.event.set({ ...event, activities: [activity] });
    component.toggleActivitySubscription(activity, true);
    expect(eventsService.unsubscribeActivity).toHaveBeenCalledWith(activity.id);
    expect(component.event()?.activities?.[0].subscribed).toBe(false);
  });

  it('recognizes an existing subscription only when the API confirms the conflict', () => {
    const activity = { ...scheduleActivity, registration_policy: 'ACTIVITY_REGISTRANTS_ONLY' as const };
    authenticated.set(true);
    component.event.set({ ...event, activities: [activity] });
    eventsService.subscribeActivity.mockReturnValueOnce(throwError(() => new HttpErrorResponse({
      status: 409, error: { messages: ['Você já está inscrito na atividade.'], details: {} },
    })));
    component.toggleActivitySubscription(activity);
    expect(component.event()?.activities?.[0].subscribed).toBe(true);
    expect(component.successMessage()).toContain('já está inscrito');
  });

  it('reports a missing activity without incorrectly claiming the API route is unavailable', () => {
    const activity = { ...scheduleActivity, registration_policy: 'ACTIVITY_REGISTRANTS_ONLY' as const };
    authenticated.set(true);
    eventsService.subscribeActivity.mockReturnValueOnce(throwError(() => new HttpErrorResponse({
      status: 404, error: { message: 'Atividade não encontrada.' },
    })));
    component.toggleActivitySubscription(activity);
    expect(component.errorMessage()).toBe('Atividade não encontrada.');
    expect(component.activitySubscriptionBusyId()).toBeNull();
  });
});
