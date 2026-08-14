import { Test, TestingModule } from '@nestjs/testing';
import { PrintersService } from '../src/modules/printers/printers.service';
import { BambuMqttService } from '../src/modules/printers/bambu-mqtt.service';
import { PrismaService } from '../src/database/prisma.service';
import { PrinterManufacturer, PrinterIntegrationType, PrintJobStatus, OrderStatus } from '@printerp/shared';

describe('PrintersService & BambuMqttService', () => {
  let printersService: PrintersService;
  let bambuMqttService: BambuMqttService;

  const mockPrismaService = {
    printer: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    printJob: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    order: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockBambuMqttService = {
    connectPrinter: jest.fn(),
    disconnectPrinter: jest.fn(),
    testConnection: jest.fn().mockResolvedValue({ success: true, message: 'Connected' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrintersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: BambuMqttService, useValue: mockBambuMqttService },
      ],
    }).compile();

    printersService = module.get<PrintersService>(PrintersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(printersService).toBeDefined();
  });

  it('should list all printers with active job formatting', async () => {
    const fakePrinters = [
      {
        id: 'printer-1',
        name: 'Bambu Lab P1S #1',
        manufacturer: PrinterManufacturer.BAMBU_LAB,
        model: 'P1S',
        serialNumber: '01P00A123',
        ipAddress: '192.168.1.120',
        accessCode: '12345678',
        integrationType: PrinterIntegrationType.BAMBUDDY,
        isActive: true,
        lastStatus: 'RUNNING',
        lastSeenAt: new Date('2026-08-14T10:00:00Z'),
        nozzleTemp: 220,
        bedTemp: 60,
        printProgress: 45,
        remainingMinutes: 75,
        currentFile: 'gear_model.gcode.3mf',
        createdAt: new Date('2026-08-14T08:00:00Z'),
        updatedAt: new Date('2026-08-14T10:00:00Z'),
        printJobs: [
          {
            id: 'job-1',
            orderId: 'order-1',
            filename: 'gear_model.gcode.3mf',
            status: PrintJobStatus.PRINTING,
            startedAt: new Date('2026-08-14T09:00:00Z'),
            order: { orderNumber: 101 },
          },
        ],
      },
    ];

    mockPrismaService.printer.findMany.mockResolvedValue(fakePrinters);

    const result = await printersService.findAll();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Bambu Lab P1S #1');
    expect(result[0].printProgress).toBe(45);
    expect(result[0].activeJob?.orderNumber).toBe(101);
  });

  it('should create a printer and connect via MQTT', async () => {
    const dto = {
      name: 'Bambu Lab X1C',
      model: 'X1C',
      serialNumber: '01X00B456',
      ipAddress: '192.168.1.125',
      accessCode: '87654321',
      manufacturer: PrinterManufacturer.BAMBU_LAB,
      integrationType: PrinterIntegrationType.BAMBUDDY,
      isActive: true,
    };

    mockPrismaService.printer.create.mockResolvedValue({
      id: 'printer-2',
      ...dto,
    });

    const result = await printersService.create(dto);

    expect(result.id).toBe('printer-2');
    expect(mockBambuMqttService.connectPrinter).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'printer-2', ipAddress: '192.168.1.125' }),
    );
  });

  it('should update print job status and sync order to PRINTING/PRINTED', async () => {
    mockPrismaService.printJob.findUnique.mockResolvedValue({
      id: 'job-10',
      orderId: 'order-20',
      printerId: 'printer-1',
      status: PrintJobStatus.QUEUED,
    });

    mockPrismaService.printJob.update.mockResolvedValue({
      id: 'job-10',
      status: PrintJobStatus.PRINTING,
    });

    mockPrismaService.order.update.mockResolvedValue({ id: 'order-20', status: OrderStatus.PRINTING });
    mockPrismaService.printer.update.mockResolvedValue({ id: 'printer-1', lastStatus: 'RUNNING' });

    const updated = await printersService.updatePrintJobStatus('job-10', PrintJobStatus.PRINTING);

    expect(updated.status).toBe(PrintJobStatus.PRINTING);
    expect(mockPrismaService.order.update).toHaveBeenCalledWith({
      where: { id: 'order-20' },
      data: { status: OrderStatus.PRINTING },
    });
  });
});
