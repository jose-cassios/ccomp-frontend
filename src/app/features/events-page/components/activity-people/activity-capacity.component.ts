import { Component, DestroyRef, EventEmitter, Input, OnChanges, Output, inject, signal } from '@angular/core';
import { Subscription, finalize } from 'rxjs';
import { EventsService } from '../../services/events.service';

export interface ActivityCapacity { current_enrollments: number; max_capacity: number | null; }

@Component({
  selector: 'app-activity-capacity', standalone: true,
  template: `
    @if (capacity(); as value) {
      <p [class.full]="value.max_capacity !== null && value.current_enrollments >= value.max_capacity" aria-live="polite">
        <strong>{{ value.current_enrollments }} / {{ value.max_capacity === null ? 'sem limite' : value.max_capacity }}</strong>
        <span> vagas preenchidas / vagas totais</span>
      </p>
    } @else if (loading()) { <small role="status">Consultando vagas…</small> }
    @else { <button type="button" (click)="load()">Consultar vagas</button> }
  `,
  styles: `:host{display:block;margin:.6rem 0}p{margin:0;font-size:.8rem;color:var(--text-secondary);overflow-wrap:anywhere}strong{color:var(--brand-700)}.full strong{color:var(--danger-text)}small,button{font:inherit;font-size:.8rem}button{background:none;border:0;padding:0;color:var(--brand-700);cursor:pointer;text-decoration:underline}`,
})
export class ActivityCapacityComponent implements OnChanges {
  @Input({ required: true }) activityId!: number;
  @Input() revision = 0;
  @Output() updated = new EventEmitter<ActivityCapacity>();
  private readonly api = inject(EventsService);
  private request?: Subscription;
  readonly capacity = signal<ActivityCapacity | null>(null);
  readonly loading = signal(false);
  constructor() { inject(DestroyRef).onDestroy(() => this.request?.unsubscribe()); }
  ngOnChanges(): void { this.capacity.set(null); this.load(); }
  load(): void {
    this.request?.unsubscribe(); this.loading.set(true);
    this.request = this.api.getActivityCapacity(this.activityId).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: value => { this.capacity.set(value); this.updated.emit(value); },
      error: () => this.capacity.set(null),
    });
  }
}
