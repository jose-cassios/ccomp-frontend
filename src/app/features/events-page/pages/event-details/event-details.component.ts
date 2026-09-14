import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { CONTENT_MANAGEMENT_ROLES } from '../../../auth/config/auth.config';
import { AuthService } from '../../../auth/services/auth.service';
import {
  ApiMessage,
  EventActivity,
  EventDetails,
  apiMessage,
  eventActivityTypeLabel,
  eventActivityWeekdayLabel,
  eventCategoryLabel,
  eventEnrollmentStatusLabel,
  eventExecutionStatusLabel,
  eventFormatLabel,
  eventPublicationStatusLabel,
  activitiesOverlap,
  groupEventActivities,
} from '../../models/event.model';
import { EventsService } from '../../services/events.service';
import { apiErrorMessage } from '../../../../core/api/api-error';

@Component({
  selector: 'app-event-details',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './event-details.component.html',
  styleUrl: './event-details.component.css',
})
export class EventDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly eventsService = inject(EventsService);
  private readonly authService = inject(AuthService);

  readonly event = signal<EventDetails | null>(null);
  readonly loading = signal(true);
  readonly subscriptionBusy = signal(false);
  readonly subscribed = signal(false);
  readonly subscriptionStateLoading = signal(false);
  readonly subscriptionStateResolved = signal(false);
  readonly activitiesLoading = signal(false);
  readonly activitiesError = signal<string | null>(null);
  readonly activitySubscriptionBusyId = signal<number | null>(null);
  readonly activeActivityDay = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly editableEventIds = signal<ReadonlySet<number>>(new Set());
  readonly isAuthenticated = this.authService.isAuthenticatedState;
  readonly canEdit = computed(() => {
    const eventId = this.event()?.id;
    return this.authService.hasAnyRole(CONTENT_MANAGEMENT_ROLES)
      || Boolean(eventId && this.editableEventIds().has(eventId));
  });
  readonly categoryLabel = eventCategoryLabel;
  readonly formatLabel = eventFormatLabel;
  readonly publicationStatusLabel = eventPublicationStatusLabel;
  readonly executionStatusLabel = eventExecutionStatusLabel;
  readonly enrollmentStatusLabel = eventEnrollmentStatusLabel;
  readonly canSubscribe = computed(() => this.event()?.enrollment_status === 'OPEN');
  readonly activitySchedule = computed(() => groupEventActivities(this.event()?.activities ?? []));
  readonly visibleActivityDay = computed(() => {
    const schedule = this.activitySchedule();
    return schedule.find((day) => day.key === this.activeActivityDay()) ?? schedule[0] ?? null;
  });
  readonly activityTypeLabel = eventActivityTypeLabel;
  readonly activityWeekdayLabel = eventActivityWeekdayLabel;

  ngOnInit(): void {
    const feedback = this.router.getCurrentNavigation()?.extras.state?.['eventFeedback'];
    if (typeof feedback === 'string' && feedback.trim()) {
      this.successMessage.set(feedback);
    }

    const id = this.route.snapshot.paramMap.get('id');
    if (!id || !/^\d+$/.test(id)) {
      this.loading.set(false);
      this.errorMessage.set('O identificador do evento é inválido.');
      return;
    }

    this.eventsService.getById(id).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (event) => {
        this.event.set({ ...event, activities: event.activities ?? [] });
        this.ensureActiveActivityDay();
        this.loadActivities(event.id);
        this.loadSubscriptionState(event.id);
        this.loadEditorAccess();
      },
      error: (error: unknown) => this.errorMessage.set(this.getErrorMessage(error)),
    });
  }

  toggleSubscription(): void {
    const event = this.event();
    if (!event || this.subscriptionBusy()) return;

    if (!this.isAuthenticated()) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: `/eventos/${event.id}` } });
      return;
    }

    if (!this.subscribed() && !this.canSubscribe()) {
      this.errorMessage.set('As inscrições não estão abertas para este evento no momento.');
      return;
    }

    this.subscriptionBusy.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    const request = this.subscribed()
      ? this.eventsService.unsubscribe(event.id)
      : this.eventsService.subscribe(event.id);

    request.pipe(finalize(() => this.subscriptionBusy.set(false))).subscribe({
      next: (response) => {
        this.subscribed.update((value) => !value);
        this.subscriptionStateResolved.set(true);
        this.successMessage.set(response.response ?? response.message ?? 'Inscrição atualizada com sucesso.');
      },
      error: (error: unknown) => {
        if (!this.subscribed() && error instanceof HttpErrorResponse && error.status === 409 && this.isAlreadySubscribedConflict(error)) {
          this.subscribed.set(true);
          this.subscriptionStateResolved.set(true);
          this.successMessage.set('Você já possui uma inscrição ativa neste evento.');
          return;
        }
        this.errorMessage.set(this.getErrorMessage(error, 'Não foi possível alterar sua inscrição.'));
      },
    });
  }

  selectActivityDay(dayKey: string): void {
    this.activeActivityDay.set(dayKey);
  }

  activityRequiresRegistration(activity: EventActivity): boolean {
    return activity.registration_policy
      ? activity.registration_policy !== 'PUBLIC'
      : activity.registration_mode === 'REQUIRED';
  }

  activityRegistrationBlocked(activity: EventActivity): boolean {
    if (activity.subscribed) return false;
    if (!this.isAuthenticated()) return false;
    if (this.activityConflict(activity)) return true;
    if (activity.can_subscribe !== null && activity.can_subscribe !== undefined) {
      return !activity.can_subscribe;
    }
    return (activity.registration_policy ? activity.registration_policy !== 'PUBLIC'
      : activity.access_requirement === 'EVENT_REGISTRATION')
      && this.subscriptionStateResolved()
      && !this.subscribed();
  }

  activityRegistrationHint(activity: EventActivity): string | null {
    if (activity.subscribed || !this.activityRequiresRegistration(activity)) return null;
    if (!this.isAuthenticated()) return null;
    const conflict = this.activityConflict(activity);
    if (conflict) return this.activityConflictMessage(conflict);
    if (activity.subscription_unavailable_reason) return activity.subscription_unavailable_reason;
    if (activity.can_subscribe === false) return 'Inscrições indisponíveis para esta atividade.';
    if (
      (activity.registration_policy ? activity.registration_policy !== 'PUBLIC'
        : activity.access_requirement === 'EVENT_REGISTRATION')
      && this.subscriptionStateResolved()
      && !this.subscribed()
    ) {
      return 'Inscreva-se primeiro no evento para reservar esta atividade.';
    }
    return null;
  }

  toggleActivitySubscription(activity: EventActivity, cancel = activity.subscribed === true): void {
    const currentEvent = this.event();
    if (!currentEvent || !this.activityRequiresRegistration(activity) || this.activitySubscriptionBusyId()) return;

    if (!this.isAuthenticated()) {
      void this.router.navigate(['/login'], {
        queryParams: { returnUrl: `/eventos/${currentEvent.id}` },
      });
      return;
    }

    if (!cancel && this.activityRegistrationBlocked(activity)) {
      this.errorMessage.set(this.activityRegistrationHint(activity) ?? 'Esta atividade não está aceitando inscrições.');
      return;
    }

    this.activitySubscriptionBusyId.set(activity.id);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    const request = cancel
      ? this.eventsService.unsubscribeActivity(activity.id)
      : this.eventsService.subscribeActivity(activity.id);

    request.pipe(finalize(() => this.activitySubscriptionBusyId.set(null))).subscribe({
      next: (response: ApiMessage) => {
        const subscribed = !cancel;
        this.updateActivitySubscription(activity.id, subscribed);
        this.successMessage.set(apiMessage(
          response,
          subscribed ? 'Inscrição na atividade confirmada.' : 'Inscrição na atividade cancelada.',
        ));
      },
      error: (error: unknown) => {
        if (
          !cancel
          && error instanceof HttpErrorResponse
          && error.status === 409
          && this.isAlreadySubscribedConflict(error)
        ) {
          this.updateActivitySubscription(activity.id, true);
          this.successMessage.set('Você já está inscrito nesta atividade.');
          return;
        }
        this.errorMessage.set(this.getErrorMessage(error, 'Não foi possível alterar a inscrição nesta atividade.'));
      },
    });
  }

  /** A known local enrollment is enough to prevent overlapping reservations. */
  activityConflict(activity: EventActivity): EventActivity | null {
    if (activity.subscribed || !this.activityRequiresRegistration(activity)) return null;
    return this.event()?.activities?.find((candidate) => candidate.id !== activity.id
      && candidate.subscribed === true
      && activitiesOverlap(candidate, activity)) ?? null;
  }

  activityConflictMessage(conflict: EventActivity): string {
    const start = this.activityTime(conflict.start_date);
    const end = this.activityTime(conflict.end_date);
    const period = start && end ? ' (' + start + '–' + end + ')' : '';
    return 'Conflito de horário: você já está inscrito em “' + conflict.title + '”' + period + '.';
  }

  dismissFeedback(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  private loadActivities(eventId: number): void {
    this.activitiesLoading.set(true);
    this.activitiesError.set(null);
    this.eventsService.getAllActivities(eventId).pipe(
      finalize(() => this.activitiesLoading.set(false)),
    ).subscribe({
      next: (activities) => {
        this.event.update((event) => event ? { ...event, activities } : event);
        this.ensureActiveActivityDay();
      },
      // Mantém as atividades incluídas nos detalhes quando a consulta complementar falha.
      error: (error: unknown) => {
        this.activitiesError.set(
          error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403) && !this.isAuthenticated()
            ? 'Entre na sua conta para consultar a programação. A API está exigindo autenticação para esta consulta.'
            : this.getErrorMessage(error, 'Não foi possível atualizar a programação.'),
        );
      },
    });
  }

  private loadSubscriptionState(eventId: number): void {
    if (!this.isAuthenticated()) return;

    this.subscriptionStateLoading.set(true);
    this.eventsService.isSubscribedToEvent(eventId).pipe(
      finalize(() => this.subscriptionStateLoading.set(false)),
    ).subscribe({
      next: (subscribed) => {
        this.subscribed.set(subscribed);
        this.subscriptionStateResolved.set(true);
      },
      error: () => this.subscriptionStateResolved.set(false),
    });
  }

  private loadEditorAccess(): void {
    if (!this.isAuthenticated()) return;

    this.eventsService.getEditableEvents(undefined, 50).pipe(
      catchError(() => of(null)),
    ).subscribe((page) => {
      if (!page) return;
      this.editableEventIds.set(new Set(page.content.map((event) => event.id)));
    });
  }

  private updateActivitySubscription(activityId: number, subscribed: boolean): void {
    this.event.update((event) => event
      ? {
          ...event,
          activities: (event.activities ?? []).map((activity) => activity.id === activityId
            ? { ...activity, subscribed }
            : activity),
        }
      : event);
  }

  private ensureActiveActivityDay(): void {
    const schedule = this.activitySchedule();
    if (!schedule.some((day) => day.key === this.activeActivityDay())) {
      this.activeActivityDay.set(schedule[0]?.key ?? null);
    }
  }

  private isAlreadySubscribedConflict(error: HttpErrorResponse): boolean {
    const body = error.error && typeof error.error === 'object'
      ? error.error as Record<string, unknown>
      : null;
    const code = String(body?.['code'] ?? body?.['error_code'] ?? '').toUpperCase();
    const message = apiErrorMessage(error, '');
    return code === 'ACTIVITY_ALREADY_SUBSCRIBED'
      || code === 'ALREADY_SUBSCRIBED'
      || /j[aá]\s+.*inscrit[oa]/i.test(message);
  }

  private activityTime(value: string | null | undefined): string | null {
    if (!value) return null;
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return null;
    return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date);
  }

  private getErrorMessage(error: unknown, fallback = 'Não foi possível carregar este evento.'): string {
    if (error instanceof HttpErrorResponse) {
      const message = apiErrorMessage(error, '');
      if (message) return message;
      if (error.status === 403) return 'Você não tem permissão para visualizar este evento.';
      if (error.status === 404) return 'O evento solicitado não foi encontrado.';
    }
    return fallback;
  }
}
