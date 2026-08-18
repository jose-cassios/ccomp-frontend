import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { AuthService } from '../../../auth/services/auth.service';
import { CONTENT_MANAGEMENT_ROLES } from '../../../auth/config/auth.config';
import {
  EventDetails,
  eventCategoryLabel,
  eventFormatLabel,
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
  readonly canEdit = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly isAuthenticated = this.authService.isAuthenticatedState;
  readonly categoryLabel = eventCategoryLabel;
  readonly formatLabel = eventFormatLabel;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id || !/^\d+$/.test(id)) {
      this.loading.set(false);
      this.errorMessage.set('O identificador do evento é inválido.');
      return;
    }

    const subscriptions = this.isAuthenticated()
      ? this.eventsService.getSubscriptions().pipe(catchError(() => of([])))
      : of([]);
    const editableEvents = this.authService.hasAnyRole(CONTENT_MANAGEMENT_ROLES)
      ? this.eventsService.getEditableEvents().pipe(catchError(() => of([])))
      : of([]);
    forkJoin({ event: this.eventsService.getById(id), subscriptions, editableEvents }).pipe(
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: ({ event, subscriptions: items, editableEvents: editableItems }) => {
        this.event.set({ ...event, activities: event.activities ?? [] });
        this.subscribed.set(items.some((item) => item.id === event.id));
        this.canEdit.set(editableItems.some((item) => item.id === event.id));
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

    this.subscriptionBusy.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    const request = this.subscribed()
      ? this.eventsService.unsubscribe(event.id)
      : this.eventsService.subscribe(event.id);

    request.pipe(finalize(() => this.subscriptionBusy.set(false))).subscribe({
      next: (response) => {
        this.subscribed.update((value) => !value);
        this.successMessage.set(response.message);
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.getErrorMessage(error, 'Não foi possível alterar sua inscrição.'));
      },
    });
  }

  private getErrorMessage(error: unknown, fallback = 'Não foi possível carregar este evento.'): string {
    if (error instanceof HttpErrorResponse) {
      const message = error.error?.message;
      if (typeof message === 'string' && message.trim()) return message;
      if (error.status === 403) return 'Você não tem permissão para visualizar este evento.';
      if (error.status === 404) return 'O evento solicitado não foi encontrado.';
    }
    return fallback;
  }
}
