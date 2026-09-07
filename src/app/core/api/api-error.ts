import { HttpErrorResponse } from '@angular/common/http';

interface ApiErrorBody {
  message?: unknown;
  detail?: unknown;
  response?: unknown;
  messages?: unknown;
  details?: unknown;
}

/** Extracts the useful domain message from both legacy and current API error payloads. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof HttpErrorResponse)) return fallback;

  const body = error.error as ApiErrorBody | string | null | undefined;
  if (typeof body === 'string' && body.trim()) return body;
  if (!body || typeof body !== 'object') return fallback;

  for (const candidate of [body.message, body.detail, body.response]) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate;
  }

  if (Array.isArray(body.messages)) {
    const messages = body.messages.filter(
      (message): message is string => typeof message === 'string' && Boolean(message.trim()),
    );
    if (messages.length) return messages.join(' ');
  }

  if (body.details && typeof body.details === 'object' && !Array.isArray(body.details)) {
    const messages = Object.values(body.details).filter(
      (message): message is string => typeof message === 'string' && Boolean(message.trim()),
    );
    if (messages.length) return messages.join(' ');
  }

  return fallback;
}
