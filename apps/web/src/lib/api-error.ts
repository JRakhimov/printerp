import { isAxiosError } from 'axios';

/**
 * Error body produced by the API's HttpExceptionFilter.
 */
interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string | string[];
  };
  message?: string | string[];
}

/**
 * Server-provided reason of a failed request, if there is one.
 */
export function getApiErrorMessage(err: unknown): string | undefined {
  if (isAxiosError<ApiErrorBody>(err)) {
    const data = err.response?.data;
    const message = data?.error?.message ?? data?.message;

    return Array.isArray(message) ? message.join(', ') : message;
  }

  if (err instanceof Error) {
    return err.message;
  }

  return undefined;
}

/**
 * User-facing error text: the local fallback plus the server reason when available.
 */
export function formatApiError(err: unknown, fallback: string): string {
  const details = getApiErrorMessage(err);

  return details ? `${fallback}: ${details}` : fallback;
}

export function getApiErrorStatus(err: unknown): number | undefined {
  return isAxiosError(err) ? err.response?.status : undefined;
}
