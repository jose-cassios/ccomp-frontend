import { effect, Signal } from '@angular/core';

/** Keeps transient toast messages visible long enough to be read, then clears them. */
export function autoDismissFeedback(
  errorMessage: Signal<string | null>,
  successMessage: Signal<string | null>,
  dismiss: () => void,
  delayMs = 9_000,
) {
  return effect((onCleanup) => {
    if (typeof window === 'undefined' || (!errorMessage() && !successMessage())) return;

    const timer = window.setTimeout(dismiss, delayMs);
    onCleanup(() => window.clearTimeout(timer));
  });
}
