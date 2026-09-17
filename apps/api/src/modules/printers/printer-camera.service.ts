import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  OnModuleDestroy,
} from '@nestjs/common';
import * as tls from 'tls';
import { spawn, ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import { Response } from 'express';
import { EventEmitter } from 'events';
import { PrismaService } from '../../database/prisma.service';
import { AnycubicMqttService } from './anycubic-mqtt.service';

interface BambuCameraSession {
  socket: tls.TLSSocket | null;
  clients: Set<Response>;
  latestFrame: Buffer | null;
  lastFrameTime: number;
  idleTimer: NodeJS.Timeout | null;
  connecting: boolean;
  emitter: EventEmitter;
  buffer: Buffer;
  expectedPayloadSize: number;
}

interface AnycubicCameraSession {
  ffmpegProcess: ChildProcess | null;
  clients: Set<Response>;
  latestFrame: Buffer | null;
  lastFrameTime: number;
  idleTimer: NodeJS.Timeout | null;
  connecting: boolean;
  rateLimitedUntil: number;
  lastError: string | null;
  emitter: EventEmitter;
  buffer: Buffer;
}

@Injectable()
export class PrinterCameraService implements OnModuleDestroy {
  private readonly logger = new Logger(PrinterCameraService.name);
  private bambuSessions = new Map<string, BambuCameraSession>();
  private anycubicSessions = new Map<string, AnycubicCameraSession>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly anycubicMqttService: AnycubicMqttService,
  ) {}

  onModuleDestroy() {
    // Clean up all Bambu sessions
    for (const [id, session] of this.bambuSessions.entries()) {
      if (session.idleTimer) clearTimeout(session.idleTimer);
      for (const client of session.clients) {
        try {
          client.end();
        } catch {}
      }
      if (session.socket) {
        try {
          session.socket.destroy();
        } catch {}
      }
    }
    this.bambuSessions.clear();

    // Clean up all Anycubic sessions
    for (const [id, session] of this.anycubicSessions.entries()) {
      if (session.idleTimer) clearTimeout(session.idleTimer);
      for (const client of session.clients) {
        try {
          client.end();
        } catch {}
      }
      if (session.ffmpegProcess) {
        try {
          session.ffmpegProcess.kill('SIGTERM');
        } catch {}
      }
    }
    this.anycubicSessions.clear();
  }

  /**
   * Helper to build Bambu Lab 80-byte authentication packet
   */
  buildBambuAuthPacket(accessCode: string): Buffer {
    const authBuf = Buffer.alloc(80, 0);
    // Header (16 bytes)
    authBuf.writeUInt32LE(0x40, 0);   // length/magic 0x40 (64 bytes payload)
    authBuf.writeUInt32LE(0x3000, 4); // command/magic 0x3000
    authBuf.writeUInt32LE(0, 8);
    authBuf.writeUInt32LE(0, 12);
    // Username 'bblp' (32 bytes null-padded)
    authBuf.write('bblp', 16, 32, 'ascii');
    // Access code (32 bytes null-padded)
    authBuf.write(accessCode || '', 48, 32, 'ascii');
    return authBuf;
  }

  /**
   * Parse frame buffer from Bambu Lab TLS stream
   */
  processBambuChunk(session: BambuCameraSession, chunk: Buffer) {
    session.buffer = Buffer.concat([session.buffer, chunk]);

    while (session.buffer.length >= 16) {
      if (session.expectedPayloadSize === 0) {
        // Read 16-byte header
        session.expectedPayloadSize = session.buffer.readUInt32LE(0);
      }

      const totalRequired = 16 + session.expectedPayloadSize;
      if (session.buffer.length < totalRequired) {
        // Need more data
        break;
      }

      // We have a full image payload
      const jpegPayload = session.buffer.subarray(16, totalRequired);
      session.buffer = session.buffer.subarray(totalRequired);
      session.expectedPayloadSize = 0;

      // Verify JPEG magic bytes (FF D8 ... FF D9)
      if (
        jpegPayload.length > 4 &&
        jpegPayload[0] === 0xff &&
        jpegPayload[1] === 0xd8 &&
        jpegPayload[jpegPayload.length - 2] === 0xff &&
        jpegPayload[jpegPayload.length - 1] === 0xd9
      ) {
        session.latestFrame = jpegPayload;
        session.lastFrameTime = Date.now();
        session.emitter.emit('frame', jpegPayload);

        // Broadcast to all active MJPEG clients
        this.broadcastFrame(session.clients, jpegPayload);
      } else {
        this.logger.debug(
          `Received non-JPEG frame or partial frame (len: ${jpegPayload.length})`,
        );
      }
    }
  }

  /**
   * Broadcast a JPEG frame as an MJPEG multipart chunk
   */
  private broadcastFrame(clients: Set<Response>, frame: Buffer) {
    const boundary = 'frame';
    const header = `--${boundary}\r\nContent-Type: image/jpeg\r\nContent-Length: ${frame.length}\r\n\r\n`;

    for (const res of clients) {
      try {
        if (!res.writableEnded && res.writable) {
          res.write(header);
          res.write(frame);
          res.write('\r\n');
        }
      } catch (err) {
        clients.delete(res);
      }
    }
  }

  /**
   * Connect to Bambu Lab camera TLS socket on port 6000
   */
  private async connectBambuCamera(
    printer: { id: string; name: string; ipAddress: string; accessCode?: string | null },
    session: BambuCameraSession,
  ): Promise<void> {
    if (session.socket && !session.socket.destroyed) {
      return;
    }

    session.connecting = true;
    const cleanIp = printer.ipAddress.replace(/^https?:\/\//i, '').replace(/:.*$/, '').trim();
    const port = 6000;
    const accessCode = printer.accessCode || '';

    return new Promise<void>((resolve, reject) => {
      let resolved = false;

      this.logger.log(`Connecting to Bambu camera TLS on ${cleanIp}:${port} for "${printer.name}"...`);

      const socket = tls.connect(
        {
          host: cleanIp,
          port,
          rejectUnauthorized: false,
          timeout: 7000,
        },
        () => {
          this.logger.log(`Connected to Bambu camera TLS on ${cleanIp}:${port}. Sending auth packet...`);
          const authPacket = this.buildBambuAuthPacket(accessCode);
          socket.write(authPacket);
          session.connecting = false;
          session.socket = socket;
          if (!resolved) {
            resolved = true;
            resolve();
          }
        },
      );

      socket.on('data', (chunk: Buffer) => {
        this.processBambuChunk(session, chunk);
      });

      socket.on('error', (err: any) => {
        this.logger.warn(`Bambu camera TLS error for "${printer.name}": ${err.message}`);
        session.connecting = false;
        if (!resolved) {
          resolved = true;
          reject(err);
        }
      });

      socket.on('timeout', () => {
        this.logger.warn(`Bambu camera TLS connection timed out for "${printer.name}"`);
        socket.destroy();
        session.connecting = false;
        if (!resolved) {
          resolved = true;
          reject(new Error(`Timeout connecting to Bambu camera at ${cleanIp}:${port}`));
        }
      });

      socket.on('close', () => {
        this.logger.log(`Bambu camera TLS socket closed for "${printer.name}"`);
        session.socket = null;
        session.connecting = false;
      });
    });
  }

  /**
   * Get or initialize Bambu session
   */
  private getOrCreateBambuSession(printerId: string): BambuCameraSession {
    let session = this.bambuSessions.get(printerId);
    if (!session) {
      session = {
        socket: null,
        clients: new Set<Response>(),
        latestFrame: null,
        lastFrameTime: 0,
        idleTimer: null,
        connecting: false,
        emitter: new EventEmitter(),
        buffer: Buffer.alloc(0),
        expectedPayloadSize: 0,
      };
      this.bambuSessions.set(printerId, session);
    }
    return session;
  }

  /**
   * Get or initialize Anycubic session
   */
  private getOrCreateAnycubicSession(printerId: string): AnycubicCameraSession {
    let session = this.anycubicSessions.get(printerId);
    if (!session) {
      session = {
        ffmpegProcess: null,
        clients: new Set<Response>(),
        latestFrame: null,
        lastFrameTime: 0,
        idleTimer: null,
        connecting: false,
        rateLimitedUntil: 0,
        lastError: null,
        emitter: new EventEmitter(),
        buffer: Buffer.alloc(0),
      };
      this.anycubicSessions.set(printerId, session);
    }
    return session;
  }

  /**
   * Find available ffmpeg binary path
   */
  private getFfmpegPath(): string {
    const candidates = [
      process.env.FFMPEG_PATH,
      '/Users/raximov.j/homebrew/bin/ffmpeg',
      '/opt/homebrew/bin/ffmpeg',
      '/usr/local/bin/ffmpeg',
      'ffmpeg',
    ].filter(Boolean) as string[];

    for (const p of candidates) {
      try {
        if (p === 'ffmpeg') return 'ffmpeg';
        if (existsSync(p)) return p;
      } catch {}
    }
    return 'ffmpeg';
  }

  buildAnycubicStreamUrl(printerIp: string, reportedUrl?: string): string {
    const cleanIp = printerIp.replace(/^https?:\/\//i, '').replace(/:.*$/, '').trim();
    const url = reportedUrl?.trim();

    if (!url) return `http://${cleanIp}:18088/flv`;
    if (/^[a-z][a-z\d+.-]*:\/\//i.test(url)) return url;
    if (url.startsWith('/')) return `http://${cleanIp}:18088${url}`;
    return `http://${url}`;
  }

  private waitForAnycubicFrame(
    session: AnycubicCameraSession,
    timeoutMs = 10_000,
  ): Promise<void> {
    if (session.latestFrame && Date.now() - session.lastFrameTime < 10_000) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timeout);
        session.emitter.off('frame', onFrame);
        session.emitter.off('streamError', onError);
      };
      const onFrame = () => {
        cleanup();
        resolve();
      };
      const onError = (message: string) => {
        cleanup();
        reject(new ServiceUnavailableException(message));
      };
      const timeout = setTimeout(() => {
        cleanup();
        reject(
          new ServiceUnavailableException(
            session.lastError || 'Таймаут ожидания видеопотока Anycubic',
          ),
        );
      }, timeoutMs);

      session.emitter.once('frame', onFrame);
      session.emitter.once('streamError', onError);
    });
  }

  /**
   * Parse MJPEG chunks from ffmpeg stdout (SOI 0xFFD8 to EOI 0xFFD9)
   */
  processFfmpegChunk(session: AnycubicCameraSession, chunk: Buffer) {
    session.buffer = Buffer.concat([session.buffer, chunk]);

    while (true) {
      // Find SOI marker (FF D8)
      const soiIdx = session.buffer.indexOf(Buffer.from([0xff, 0xd8]));
      if (soiIdx === -1) {
        session.buffer = session.buffer.subarray(Math.max(0, session.buffer.length - 1));
        break;
      }

      if (soiIdx > 0) {
        session.buffer = session.buffer.subarray(soiIdx);
      }

      // Find EOI marker (FF D9) after SOI
      const eoiIdx = session.buffer.indexOf(Buffer.from([0xff, 0xd9]), 2);
      if (eoiIdx === -1) {
        break;
      }

      const frameLength = eoiIdx + 2;
      const jpegPayload = session.buffer.subarray(0, frameLength);
      session.buffer = session.buffer.subarray(frameLength);

      session.latestFrame = jpegPayload;
      session.lastFrameTime = Date.now();
      session.lastError = null;
      session.emitter.emit('frame', jpegPayload);

      // Broadcast to all active MJPEG clients
      this.broadcastFrame(session.clients, jpegPayload);
    }
  }

  /**
   * Start ffmpeg process to convert Anycubic FLV/HTTP stream to MJPEG pipe
   */
  private async startAnycubicFfmpeg(
    printer: { id: string; name: string; ipAddress: string },
    session: AnycubicCameraSession,
  ): Promise<void> {
    if (session.ffmpegProcess && !session.ffmpegProcess.killed) {
      return;
    }

    if (Date.now() < session.rateLimitedUntil) {
      throw new ServiceUnavailableException(
        session.lastError || 'Камера Anycubic временно заблокировала запросы (Rate Limited 429)',
      );
    }

    const rawUrl = this.anycubicMqttService.getCameraUrl(printer.id);
    const streamUrl = this.buildAnycubicStreamUrl(printer.ipAddress, rawUrl);
    const ffmpegPath = this.getFfmpegPath();

    this.logger.log(`Starting ffmpeg camera stream for Anycubic "${printer.name}" from ${streamUrl}...`);

    const args = [
      '-reconnect', '1',
      '-reconnect_at_eof', '1',
      '-reconnect_streamed', '1',
      '-reconnect_delay_max', '2',
      '-i', streamUrl,
      '-f', 'image2pipe',
      '-vcodec', 'mjpeg',
      '-q:v', '3',
      '-r', '5',
      '-',
    ];

    try {
      const proc = spawn(ffmpegPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      session.ffmpegProcess = proc;
      session.connecting = false;

      proc.stdout.on('data', (chunk: Buffer) => {
        this.processFfmpegChunk(session, chunk);
      });

      let stderrBuf = '';
      proc.stderr.on('data', (data: Buffer) => {
        const text = data.toString();
        stderrBuf += text;
        if (stderrBuf.length > 2000) {
          stderrBuf = stderrBuf.slice(-1000);
        }

        if (text.includes('429 Too Many Requests')) {
          session.rateLimitedUntil = Date.now() + 60_000;
          session.lastError = 'Камера Anycubic временно заблокировала запросы (Rate Limited 429)';
          this.logger.warn(`Anycubic "${printer.name}" camera returned 429 Too Many Requests. Cooling down for 60s.`);
        }
      });

      proc.on('error', (err: any) => {
        this.logger.warn(`FFmpeg process error for "${printer.name}": ${err.message}`);
        session.lastError = `FFmpeg: ${err.message}`;
        session.ffmpegProcess = null;
        session.emitter.emit('streamError', session.lastError);
      });

      proc.on('close', (code) => {
        this.logger.log(`FFmpeg process closed for "${printer.name}" (code: ${code})`);
        session.ffmpegProcess = null;
        if (code !== 0 && code !== null) {
          session.lastError = stderrBuf.slice(-300).trim() || `FFmpeg завершился с кодом ${code}`;
          session.emitter.emit('streamError', session.lastError);
        }
      });
    } catch (err: any) {
      this.logger.error(`Failed to spawn ffmpeg: ${err.message}`);
      throw new ServiceUnavailableException(`Failed to launch camera decoder: ${err.message}`);
    }
  }

  /**
   * Capture a single snapshot using ffmpeg one-shot command
   */
  private async captureAnycubicSnapshotOnce(
    printer: { id: string; name: string; ipAddress: string },
    session: AnycubicCameraSession,
  ): Promise<Buffer> {
    if (Date.now() < session.rateLimitedUntil) {
      throw new ServiceUnavailableException(
        session.lastError || 'Камера Anycubic временно заблокировала запросы (Rate Limited 429)',
      );
    }

    const rawUrl = this.anycubicMqttService.getCameraUrl(printer.id);
    const streamUrl = this.buildAnycubicStreamUrl(printer.ipAddress, rawUrl);
    const ffmpegPath = this.getFfmpegPath();

    return new Promise<Buffer>((resolve, reject) => {
      const args = [
        '-t', '4',
        '-i', streamUrl,
        '-frames:v', '1',
        '-f', 'image2pipe',
        '-vcodec', 'mjpeg',
        '-q:v', '3',
        '-',
      ];

      const proc = spawn(ffmpegPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      const chunks: Buffer[] = [];
      let stderrText = '';

      proc.stdout.on('data', (d: Buffer) => chunks.push(d));
      proc.stderr.on('data', (d: Buffer) => {
        stderrText += d.toString();
        if (stderrText.includes('429 Too Many Requests')) {
          session.rateLimitedUntil = Date.now() + 60_000;
          session.lastError = 'Камера Anycubic временно заблокировала запросы (Rate Limited 429)';
        }
      });

      proc.on('error', (err) => {
        reject(new ServiceUnavailableException(`FFmpeg error: ${err.message}`));
      });

      proc.on('close', (code) => {
        const fullBuf = Buffer.concat(chunks);
        if (
          code === 0 &&
          fullBuf.length > 100 &&
          fullBuf[0] === 0xff &&
          fullBuf[1] === 0xd8
        ) {
          session.lastError = null;
          resolve(fullBuf);
        } else if (stderrText.includes('429 Too Many Requests')) {
          reject(
            new ServiceUnavailableException(
              'Камера Anycubic временно заблокировала запросы (Rate Limited 429). Пожалуйста, подождите или перезагрузите принтер после завершения печати.',
            ),
          );
        } else {
          reject(
            new ServiceUnavailableException(
              `Не удалось получить кадр с камеры Anycubic: ${stderrText.slice(-200).trim() || 'неизвестная ошибка'}`,
            ),
          );
        }
      });
    });
  }

  /**
   * Stream live MJPEG video to HTTP response
   */
  async streamCamera(printerId: string, res: Response): Promise<void> {
    const printer = await this.prisma.printer.findUnique({
      where: { id: printerId },
    });

    if (!printer) {
      throw new NotFoundException(`Printer with ID "${printerId}" not found`);
    }

    if (!printer.ipAddress) {
      throw new ServiceUnavailableException('Printer has no IP address configured');
    }

    if (printer.manufacturer === 'BAMBU_LAB') {
      this.writeMjpegHeaders(res);
      const session = this.getOrCreateBambuSession(printerId);
      if (session.idleTimer) {
        clearTimeout(session.idleTimer);
        session.idleTimer = null;
      }

      session.clients.add(res);

      // If we have a cached frame, send it immediately so viewer doesn't wait
      if (session.latestFrame) {
        this.broadcastFrame(new Set([res]), session.latestFrame);
      }

      // Connect if not connected
      if (!session.socket || session.socket.destroyed) {
        try {
          await this.connectBambuCamera(
            {
              id: printer.id,
              name: printer.name,
              ipAddress: printer.ipAddress,
              accessCode: printer.accessCode,
            },
            session,
          );
        } catch (err: any) {
          this.logger.error(`Failed to connect to Bambu camera stream: ${err.message}`);
        }
      }

      // Handle client disconnect
      res.on('close', () => {
        session.clients.delete(res);
        if (session.clients.size === 0) {
          // Disconnect from printer after 15 seconds idle
          session.idleTimer = setTimeout(() => {
            if (session.clients.size === 0 && session.socket) {
              this.logger.log(`Closing idle Bambu camera connection for "${printer.name}"`);
              session.socket.destroy();
              session.socket = null;
            }
          }, 15000);
        }
      });
    } else {
      // ANYCUBIC Stream
      const session = this.getOrCreateAnycubicSession(printerId);
      if (session.idleTimer) {
        clearTimeout(session.idleTimer);
        session.idleTimer = null;
      }

      if (Date.now() < session.rateLimitedUntil) {
        const retrySec = Math.max(1, Math.ceil((session.rateLimitedUntil - Date.now()) / 1000));
        res.writeHead(503, {
          'Content-Type': 'application/json',
          'Retry-After': retrySec.toString(),
        });
        res.end(
          JSON.stringify({
            statusCode: 503,
            message: session.lastError || 'Камера Anycubic временно заблокировала запросы (Rate Limited 429)',
            rateLimitedUntil: new Date(session.rateLimitedUntil).toISOString(),
          }),
        );
        return;
      }

      if (!session.ffmpegProcess || session.ffmpegProcess.killed) {
        try {
          try {
            await this.anycubicMqttService.setCameraCapture(printer.id, true);
          } catch (err: any) {
            this.logger.warn(`Could not start Anycubic camera capture via MQTT: ${err.message}`);
          }
          await this.startAnycubicFfmpeg(
            { id: printer.id, name: printer.name, ipAddress: printer.ipAddress },
            session,
          );
        } catch (err: any) {
          this.logger.error(`Failed to start Anycubic camera stream: ${err.message}`);
          throw new ServiceUnavailableException(err.message);
        }
      }

      await this.waitForAnycubicFrame(session);
      this.writeMjpegHeaders(res);
      session.clients.add(res);
      this.broadcastFrame(new Set([res]), session.latestFrame!);

      res.on('close', () => {
        session.clients.delete(res);
        if (session.clients.size === 0) {
          session.idleTimer = setTimeout(() => {
            if (session.clients.size === 0 && session.ffmpegProcess) {
              this.logger.log(`Stopping idle Anycubic ffmpeg stream for "${printer.name}"`);
              session.ffmpegProcess.kill('SIGTERM');
              session.ffmpegProcess = null;
              this.anycubicMqttService.setCameraCapture(printer.id, false).catch(() => {});
            }
          }, 15000);
        }
      });
    }
  }

  /**
   * Get single snapshot JPEG buffer
   */
  async getSnapshot(printerId: string): Promise<Buffer> {
    const printer = await this.prisma.printer.findUnique({
      where: { id: printerId },
    });

    if (!printer) {
      throw new NotFoundException(`Printer with ID "${printerId}" not found`);
    }

    if (!printer.ipAddress) {
      throw new ServiceUnavailableException('Printer has no IP address configured');
    }

    if (printer.manufacturer === 'BAMBU_LAB') {
      const session = this.getOrCreateBambuSession(printerId);

      // Return recent frame if younger than 4 seconds
      if (session.latestFrame && Date.now() - session.lastFrameTime < 4000) {
        return session.latestFrame;
      }

      // If already connected, wait for next frame
      if (session.socket && !session.socket.destroyed) {
        return new Promise<Buffer>((resolve, reject) => {
          const timeout = setTimeout(() => {
            session.emitter.off('frame', onFrame);
            if (session.latestFrame) resolve(session.latestFrame);
            else reject(new ServiceUnavailableException('Timeout waiting for camera frame'));
          }, 4000);

          const onFrame = (frame: Buffer) => {
            clearTimeout(timeout);
            session.emitter.off('frame', onFrame);
            resolve(frame);
          };

          session.emitter.once('frame', onFrame);
        });
      }

      // Temporarily connect to grab a frame
      await this.connectBambuCamera(
        {
          id: printer.id,
          name: printer.name,
          ipAddress: printer.ipAddress,
          accessCode: printer.accessCode,
        },
        session,
      );

      return new Promise<Buffer>((resolve, reject) => {
        const timeout = setTimeout(() => {
          session.emitter.off('frame', onFrame);
          // If no clients watching, close socket
          if (session.clients.size === 0 && session.socket) {
            session.socket.destroy();
            session.socket = null;
          }
          if (session.latestFrame) resolve(session.latestFrame);
          else reject(new ServiceUnavailableException('Timeout waiting for camera frame'));
        }, 5000);

        const onFrame = (frame: Buffer) => {
          clearTimeout(timeout);
          session.emitter.off('frame', onFrame);
          if (session.clients.size === 0 && session.socket) {
            session.socket.destroy();
            session.socket = null;
          }
          resolve(frame);
        };

        session.emitter.once('frame', onFrame);
      });
    } else {
      // ANYCUBIC Snapshot
      const session = this.getOrCreateAnycubicSession(printerId);
      if (session.latestFrame && Date.now() - session.lastFrameTime < 4000) {
        return session.latestFrame;
      }

      if (session.ffmpegProcess && !session.ffmpegProcess.killed) {
        return new Promise<Buffer>((resolve, reject) => {
          const timeout = setTimeout(() => {
            session.emitter.off('frame', onFrame);
            if (session.latestFrame) resolve(session.latestFrame);
            else reject(new ServiceUnavailableException('Timeout waiting for Anycubic camera frame'));
          }, 4000);

          const onFrame = (frame: Buffer) => {
            clearTimeout(timeout);
            session.emitter.off('frame', onFrame);
            resolve(frame);
          };

          session.emitter.once('frame', onFrame);
        });
      }

      try {
        await this.anycubicMqttService.setCameraCapture(printer.id, true);
      } catch (err: any) {
        this.logger.warn(`Could not start Anycubic camera capture via MQTT: ${err.message}`);
      }

      let frame: Buffer;
      try {
        frame = await this.captureAnycubicSnapshotOnce(
          { id: printer.id, name: printer.name, ipAddress: printer.ipAddress },
          session,
        );
      } finally {
        this.anycubicMqttService.setCameraCapture(printer.id, false).catch(() => {});
      }
      session.latestFrame = frame;
      session.lastFrameTime = Date.now();
      return frame;
    }
  }

  /**
   * Get camera status and stream statistics
   */
  async getCameraStatus(printerId: string) {
    const printer = await this.prisma.printer.findUnique({
      where: { id: printerId },
    });

    if (!printer) {
      throw new NotFoundException(`Printer with ID "${printerId}" not found`);
    }

    const isBambu = printer.manufacturer === 'BAMBU_LAB';
    const bambuSession = this.bambuSessions.get(printerId);
    const anycubicSession = this.anycubicSessions.get(printerId);

    const isStreaming = isBambu
      ? !!bambuSession?.socket && !bambuSession.socket.destroyed
      : !!anycubicSession?.ffmpegProcess && !anycubicSession.ffmpegProcess.killed;

    const isRateLimited = !isBambu && !!anycubicSession && Date.now() < anycubicSession.rateLimitedUntil;

    const lastFrameTime = isBambu
      ? bambuSession?.lastFrameTime || 0
      : anycubicSession?.lastFrameTime || 0;

    const activeViewers = isBambu
      ? bambuSession?.clients.size || 0
      : anycubicSession?.clients.size || 0;

    const hasRecentFrame = Date.now() - lastFrameTime < 10000;

    return {
      printerId,
      manufacturer: printer.manufacturer,
      isStreaming,
      activeViewers,
      hasRecentFrame,
      lastFrameAt: lastFrameTime > 0 ? new Date(lastFrameTime) : null,
      streamUrl: `/api/printers/${printerId}/camera/stream`,
      snapshotUrl: `/api/printers/${printerId}/camera/snapshot`,
      rateLimited: isRateLimited,
      rateLimitedUntil: isRateLimited ? new Date(anycubicSession!.rateLimitedUntil) : null,
      errorMessage: !isBambu ? anycubicSession?.lastError : null,
    };
  }

  private writeMjpegHeaders(res: Response) {
    res.writeHead(200, {
      'Content-Type': 'multipart/x-mixed-replace; boundary=frame',
      'Cache-Control': 'no-cache, no-store, must-revalidate, pre-check=0, post-check=0, max-age=0',
      Pragma: 'no-cache',
      Connection: 'keep-alive',
      Expires: '0',
    });
  }
}
