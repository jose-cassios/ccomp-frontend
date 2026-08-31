import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { CONTENT_MANAGEMENT_ROLES } from '../../../auth/config/auth.config';
import { AuthService } from '../../../auth/services/auth.service';
import {
  EventDetails,
  eventCategoryLabel,
  eventEnrollmentStatusLabel,
  eventExecutionStatusLabel,
  eventFormatLabel,
  eventPublicationStatusLabel,
} from '../../models/event.model';
import { EventsService } from '../../services/events.service';

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
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly isAuthenticated = this.authService.isAuthenticatedState;
  readonly canEdit = computed(() =>
    this.authService.hasAnyRole(CONTENT_MANAGEMENT_ROLES),
  );
  readonly categoryLabel = eventCategoryLabel;
  readonly formatLabel = eventFormatLabel;
  readonly publicationStatusLabel = eventPublicationStatusLabel;
  readonly executionStatusLabel = eventExecutionStatusLabel;
  readonly enrollmentStatusLabel = eventEnrollmentStatusLabel;
  readonly canSubscribe = computed(() => this.event()?.enrollment_status === 'OPEN');

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id || !/^\d+$/.test(id)) {
      this.loading.set(false);
      this.errorMessage.set('O identificador do evento é inválido.');
      return;
    }

    this.eventsService.getById(id).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (event) => {
        this.event.set({ ...event, activities: event.activities ?? [] });
        this.loadActivities(event.id);
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
        this.successMessage.set(response.response ?? response.message ?? 'Inscrição atualizada com sucesso.');
      },
      error: (error: unknown) => {
        if (!this.subscribed() && error instanceof HttpErrorResponse && error.status === 409) {
          this.subscribed.set(true);
          this.successMessage.set('Você já possui uma inscrição ativa neste evento.');
          return;
        }
        this.errorMessage.set(this.getErrorMessage(error, 'Não foi possível alterar sua inscrição.'));
      },
    });
  }

  private loadActivities(eventId: number): void {
    this.eventsService.getActivities(eventId).pipe(
      catchError(() => of({ content: [], next_cursor: null })),
    ).subscribe((page) => {
      this.event.update((event) => event ? { ...event, activities: page.content } : event);
    });
  }

  private getErrorMessage(error: unknown, fallback = 'Não foi possível carregar este evento.'): string {
    if (error instanceof HttpErrorResponse) {
      const message = error.error?.message ?? error.error?.response;
      if (typeof message === 'string' && message.trim()) return message;
      if (error.status === 403) return 'Você não tem permissão para visualizar este evento.';
      if (error.status === 404) return 'O evento solicitado não foi encontrado.';
    }
    return fallback;
  }
}
