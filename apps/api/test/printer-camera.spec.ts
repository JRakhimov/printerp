import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter } from 'events';
import { PrinterCameraService } from '../src/modules/printers/printer-camera.service';
import { AnycubicMqttService } from '../src/modules/printers/anycubic-mqtt.service';
import { PrismaService } from '../src/database/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('PrinterCameraService', () => {
  let cameraService: PrinterCameraService;

  const mockPrismaService = {
    printer: {
      findUnique: jest.fn(),
    },
  };

  const mockAnycubicMqttService = {
    getCameraUrl: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrinterCameraService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AnycubicMqttService, useValue: mockAnycubicMqttService },
      ],
    }).compile();

    cameraService = module.get<PrinterCameraService>(PrinterCameraService);
  });

  afterEach(() => {
    cameraService.onModuleDestroy();
  });

  describe('buildBambuAuthPacket', () => {
    it('should build exactly 80-byte authentication packet with correct magic and credentials', () => {
      const accessCode = '12345678';
      const packet = cameraService.buildBambuAuthPacket(accessCode);

      expect(packet.length).toBe(80);

      // Header 16 bytes: 0x40, 0x3000, 0, 0
      expect(packet.readUInt32LE(0)).toBe(0x40);
      expect(packet.readUInt32LE(4)).toBe(0x3000);
      expect(packet.readUInt32LE(8)).toBe(0);
      expect(packet.readUInt32LE(12)).toBe(0);

      // Username: 'bblp' at offset 16 (32 bytes padded)
      const username = packet.subarray(16, 48).toString('ascii').replace(/\0+$/, '');
      expect(username).toBe('bblp');

      // AccessCode at offset 48 (32 bytes padded)
      const code = packet.subarray(48, 80).toString('ascii').replace(/\0+$/, '');
      expect(code).toBe(accessCode);
    });
  });

  describe('processBambuChunk', () => {
    it('should parse 16-byte header and extract valid JPEG frame payload', () => {
      const mockSession: any = {
        buffer: Buffer.alloc(0),
        expectedPayloadSize: 0,
        latestFrame: null,
        lastFrameTime: 0,
        clients: new Set(),
        emitter: new EventEmitter(),
      };

      // Mock JPEG frame (SOI FF D8 ... EOI FF D9)
      const mockJpeg = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
        0x00, 0x01, 0x01, 0x01, 0x00, 0x60, 0x00, 0x60, 0x00, 0x00,
        0xff, 0xd9,
      ]);

      // 16-byte header with payload length
      const header = Buffer.alloc(16, 0);
      header.writeUInt32LE(mockJpeg.length, 0);
      header.writeUInt32LE(0, 4);
      header.writeUInt32LE(1, 8);
      header.writeUInt32LE(0, 12);

      const frameEmitted = new Promise<Buffer>((resolve) => {
        mockSession.emitter.on('frame', resolve);
      });

      // Deliver chunk in two parts to test stream buffering
      cameraService.processBambuChunk(mockSession, header);
      expect(mockSession.expectedPayloadSize).toBe(mockJpeg.length);
      expect(mockSession.latestFrame).toBeNull();

      cameraService.processBambuChunk(mockSession, mockJpeg);
      expect(mockSession.latestFrame).toEqual(mockJpeg);
      expect(mockSession.lastFrameTime).toBeGreaterThan(0);

      return expect(frameEmitted).resolves.toEqual(mockJpeg);
    });
  });

  describe('processFfmpegChunk', () => {
    it('should extract JPEG frames from ffmpeg MJPEG stream chunks', () => {
      const mockSession: any = {
        buffer: Buffer.alloc(0),
        latestFrame: null,
        lastFrameTime: 0,
        clients: new Set(),
        emitter: new EventEmitter(),
      };

      const mockJpeg = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
        0xff, 0xd9,
      ]);

      const frameEmitted = new Promise<Buffer>((resolve) => {
        mockSession.emitter.on('frame', resolve);
      });

      // Split across two chunks
      const chunk1 = Buffer.concat([Buffer.from([0x00, 0x00]), mockJpeg.subarray(0, 6)]);
      const chunk2 = mockJpeg.subarray(6);

      cameraService.processFfmpegChunk(mockSession, chunk1);
      expect(mockSession.latestFrame).toBeNull();

      cameraService.processFfmpegChunk(mockSession, chunk2);
      expect(mockSession.latestFrame).toEqual(mockJpeg);
      expect(mockSession.lastFrameTime).toBeGreaterThan(0);

      return expect(frameEmitted).resolves.toEqual(mockJpeg);
    });
  });

  describe('getCameraStatus', () => {
    it('should return camera status and stream URLs for Bambu Lab printer', async () => {
      mockPrismaService.printer.findUnique.mockResolvedValue({
        id: 'printer-bambu',
        name: 'Bambu Lab A1',
        manufacturer: 'BAMBU_LAB',
        model: 'A1',
        ipAddress: '192.168.1.105',
      });

      const status = await cameraService.getCameraStatus('printer-bambu');
      expect(status.printerId).toBe('printer-bambu');
      expect(status.manufacturer).toBe('BAMBU_LAB');
      expect(status.streamUrl).toBe('/api/printers/printer-bambu/camera/stream');
      expect(status.snapshotUrl).toBe('/api/printers/printer-bambu/camera/snapshot');
      expect(status.isStreaming).toBe(false);
      expect(status.activeViewers).toBe(0);
    });

    it('should return camera status for Anycubic printer with rateLimited flag', async () => {
      mockPrismaService.printer.findUnique.mockResolvedValue({
        id: 'printer-anycubic',
        name: 'Anycubic Kobra X',
        manufacturer: 'ANYCUBIC',
        model: 'Anycubic Kobra X',
        ipAddress: '192.168.1.145',
      });

      const status = await cameraService.getCameraStatus('printer-anycubic');
      expect(status.printerId).toBe('printer-anycubic');
      expect(status.manufacturer).toBe('ANYCUBIC');
      expect(status.streamUrl).toBe('/api/printers/printer-anycubic/camera/stream');
      expect(status.snapshotUrl).toBe('/api/printers/printer-anycubic/camera/snapshot');
      expect(status.rateLimited).toBe(false);
    });

    it('should throw NotFoundException if printer does not exist', async () => {
      mockPrismaService.printer.findUnique.mockResolvedValue(null);

      await expect(cameraService.getCameraStatus('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
