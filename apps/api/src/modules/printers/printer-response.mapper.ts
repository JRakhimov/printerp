import { Printer, PrintJob } from '@prisma/client';
import {
  PrintJobStatus,
  PrinterIntegrationType,
  PrinterManufacturer,
  PrinterResponse,
} from '@printerp/shared';

type PrinterWithActiveJobs = Printer & {
  printJobs?: (PrintJob & { order?: { orderNumber: number } | null })[];
};

export function omitPrinterSecrets<T extends { accessCode?: unknown }>(printer: T): Omit<T, 'accessCode'> & {
  hasAccessCode: boolean;
} {
  const { accessCode, ...publicPrinter } = printer;
  return {
    ...publicPrinter,
    hasAccessCode: typeof accessCode === 'string' && accessCode.length > 0,
  };
}

export function toPrinterResponse(printer: PrinterWithActiveJobs): PrinterResponse {
  const activeJob = printer.printJobs?.[0];
  const { printJobs: _printJobs, ...publicPrinter } = omitPrinterSecrets(printer);

  return {
    ...publicPrinter,
    manufacturer: printer.manufacturer as PrinterManufacturer,
    integrationType: printer.integrationType as PrinterIntegrationType,
    lastSeenAt: printer.lastSeenAt ? printer.lastSeenAt.toISOString() : null,
    totalWorkHours: Number(
      ((printer.initialWorkHours || 0) + (printer.trackedWorkMinutes || 0) / 60).toFixed(1),
    ),
    createdAt: printer.createdAt.toISOString(),
    updatedAt: printer.updatedAt.toISOString(),
    activeJob: activeJob
      ? {
          id: activeJob.id,
          orderId: activeJob.orderId,
          orderNumber: activeJob.order?.orderNumber,
          filename: activeJob.filename,
          status: activeJob.status as PrintJobStatus,
          startedAt: activeJob.startedAt ? activeJob.startedAt.toISOString() : null,
        }
      : null,
  };
}
