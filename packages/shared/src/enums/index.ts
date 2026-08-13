export enum Role {
  OWNER = 'OWNER',
  USER = 'USER',
}

export enum ClientSource {
  TELEGRAM = 'TELEGRAM',
  INSTAGRAM = 'INSTAGRAM',
  FRIEND = 'FRIEND',
  REPEAT_CLIENT = 'REPEAT_CLIENT',
  OTHER = 'OTHER',
}

export enum FilamentMaterial {
  PLA = 'PLA',
  PETG = 'PETG',
  ABS = 'ABS',
  ASA = 'ASA',
  TPU = 'TPU',
  OTHER = 'OTHER',
}

export enum OrderStatus {
  CREATED = 'CREATED',
  DESIGN = 'DESIGN',
  PRINTING = 'PRINTING',
  PRINTED = 'PRINTED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentStatus {
  UNPAID = 'UNPAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
}

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum ExpenseCategory {
  FILAMENT = 'FILAMENT',
  ELECTRICITY = 'ELECTRICITY',
  PRINTER_PARTS = 'PRINTER_PARTS',
  TOOLS = 'TOOLS',
  DELIVERY = 'DELIVERY',
  OTHER = 'OTHER',
}

export enum PrinterManufacturer {
  BAMBU_LAB = 'BAMBU_LAB',
  ANYCUBIC = 'ANYCUBIC',
  OTHER = 'OTHER',
}

export enum PrinterIntegrationType {
  MANUAL = 'MANUAL',
  BAMBUDDY = 'BAMBUDDY',
  ANYCUBIC = 'ANYCUBIC',
  OTHER = 'OTHER',
}

export enum PrintJobStatus {
  QUEUED = 'QUEUED',
  PRINTING = 'PRINTING',
  PAUSED = 'PAUSED',
  FINISHED = 'FINISHED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}
