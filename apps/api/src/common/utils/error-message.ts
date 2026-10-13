/**
 * Extract a human-readable message from a value caught in a `catch` block.
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }

  return String(err);
}

/**
 * Read the Node.js system error code (e.g. ECONNREFUSED) when present.
 */
export function getErrorCode(err: unknown): string | number | undefined {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const code = err.code;

    if (typeof code === 'string' || typeof code === 'number') {
      return code;
    }
  }

  return undefined;
}
