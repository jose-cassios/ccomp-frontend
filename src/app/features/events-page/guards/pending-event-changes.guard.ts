import { CanDeactivateFn } from '@angular/router';

export interface PendingEventChangesAware {
  canDeactivate(): boolean;
}

export const pendingEventChangesGuard: CanDeactivateFn<PendingEventChangesAware> = (component) =>
  component.canDeactivate();
