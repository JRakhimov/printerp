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
  POST_PROCESSING = 'POST_PROCESSING',
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
  SOFT = 'SOFT',
  DELIVERY = 'DELIVERY',
  ADS = 'ADS',
  SCRAP = 'SCRAP',
  OTHER = 'OTHER',
}

export enum ScrapReason {
  LAYER_SHIFT = 'LAYER_SHIFT',
  BED_ADHESION = 'BED_ADHESION',
  CLOG = 'CLOG',
  WARPING = 'WARPING',
  STRINGING = 'STRINGING',
  DIMENSIONAL_ERROR = 'DIMENSIONAL_ERROR',
  PURGE_WASTE = 'PURGE_WASTE',
  CALIBRATION = 'CALIBRATION',
  MODEL_ERROR = 'MODEL_ERROR',
  OTHER = 'OTHER',
}

export const ScrapReasonLabels: Record<ScrapReason, string> = {
  [ScrapReason.LAYER_SHIFT]: 'Сдвиг слоев (Layer shift)',
  [ScrapReason.BED_ADHESION]: 'Отрыв от стола (Bed adhesion)',
  [ScrapReason.CLOG]: 'Засор сопла / недоэкструзия',
  [ScrapReason.WARPING]: 'Усадка / деформация (Warping)',
  [ScrapReason.STRINGING]: 'Паутина / наплывы',
  [ScrapReason.DIMENSIONAL_ERROR]: 'Ошибка геометрии / размеров',
  [ScrapReason.PURGE_WASTE]: 'Продувка / слив пластика (Poop)',
  [ScrapReason.CALIBRATION]: 'Калибровка / тесты',
  [ScrapReason.MODEL_ERROR]: 'Ошибка 3D-модели / слайсинга',
  [ScrapReason.OTHER]: 'Другое',
};

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
