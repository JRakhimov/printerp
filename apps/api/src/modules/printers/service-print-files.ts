/**
 * Built-in printer routines that report themselves as print jobs,
 * e.g. Anycubic Kobra X filament load/unload runs `Cap_plate(01)`.
 * They are not real prints, so no Telegram notifications are sent for them.
 */
const SERVICE_PRINT_FILE_PATTERNS: RegExp[] = [
  /^cap_plate\(\d+\)/i,
];

export function isServicePrintFile(filename?: string | null): boolean {
  if (!filename) {
    return false;
  }

  const baseName = filename.split(/[\\/]/).pop() || filename;

  return SERVICE_PRINT_FILE_PATTERNS.some((pattern) => pattern.test(baseName.trim()));
}
