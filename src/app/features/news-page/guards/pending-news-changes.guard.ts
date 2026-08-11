import { CanDeactivateFn } from '@angular/router';

export interface PendingNewsChangesAware {
  canDeactivate(): boolean;
}

export const pendingNewsChangesGuard: CanDeactivateFn<PendingNewsChangesAware> = (component) => {
  return component.canDeactivate();
};
