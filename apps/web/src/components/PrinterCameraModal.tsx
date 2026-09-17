import React, { useState, useEffect, useRef } from 'react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { apiClient } from '../lib/api-client';
import {
  X,
  Camera,
  Maximize2,
  Minimize2,
  RefreshCw,
  Download,
  Flame,
  Zap,
  Activity,
  AlertCircle,
  Loader2,
  FileCode,
} from 'lucide-react';

interface PrinterCameraModalProps {
  printer: any | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PrinterCameraModal: React.FC<PrinterCameraModalProps> = ({
  printer,
  isOpen,
  onClose,
}) => {
  useBodyScrollLock(isOpen);

  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [streamKey, setStreamKey] = useState<number>(Date.now());
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<any>(null);

  useEffect(() => {
    if (isOpen && printer?.id) {
      setStreamKey(Date.now());
      setIsLoaded(false);
      setHasError(false);
      apiClient
        .get(`/printers/${printer.id}/camera/status`)
        .then((res) => setCameraStatus(res.data))
        .catch(() => {});
    }
  }, [isOpen, printer?.id]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  if (!isOpen || !printer) return null;

  const apiBase = apiClient.defaults.baseURL || '';
  const token = localStorage.getItem('printerp_jwt_token') || '';
  const streamUrl = `${apiBase}/printers/${printer.id}/camera/stream?token=${encodeURIComponent(
    token,
  )}&_k=${streamKey}`;
  const snapshotUrl = `${apiBase}/printers/${printer.id}/camera/snapshot?token=${encodeURIComponent(
    token,
  )}&_k=${Date.now()}`;

  const isBambu = printer.manufacturer === 'BAMBU_LAB';
  const isAnycubic = printer.manufacturer === 'ANYCUBIC';
  const isPrinting = printer.lastStatus === 'RUNNING' || printer.lastStatus === 'PRINTING';
  const progress = printer.printProgress ?? 0;

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen toggle error:', err);
    }
  };

  const handleDownloadSnapshot = async () => {
    try {
      setDownloading(true);
      const res = await fetch(snapshotUrl);
      if (!res.ok) {
        if (res.status === 503) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Камера временно заблокирована принтером (429)');
        }
        throw new Error('Не удалось скачать снимок');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `camera_${printer.name.replace(/\s+/g, '_')}_${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Download snapshot error:', err);
      alert(err.message || 'Ошибка загрузки снимка');
    } finally {
      setDownloading(false);
    }
  };

  const handleReconnect = () => {
    setIsLoaded(false);
    setHasError(false);
    setStreamKey(Date.now());
    apiClient
      .get(`/printers/${printer.id}/camera/status`)
      .then((res) => setCameraStatus(res.data))
      .catch(() => {});
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div
        ref={containerRef}
        className={`w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
          isFullscreen ? 'max-w-none h-full rounded-none border-none' : 'max-h-[90vh]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Camera className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white truncate">{printer.name}</h3>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${
                    isBambu
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : isAnycubic
                      ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {printer.model || printer.manufacturer}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    hasError
                      ? 'bg-rose-500'
                      : isLoaded
                      ? 'bg-emerald-400 animate-pulse'
                      : 'bg-amber-400 animate-pulse'
                  }`}
                />
                <span>
                  {hasError
                    ? 'Камера оффлайн'
                    : isLoaded
                    ? isBambu
                      ? 'В эфире • Bambu TLS (~1-2 FPS)'
                      : 'В эфире • Anycubic Stream'
                    : 'Подключение к потоку...'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleReconnect}
              title="Переподключить поток"
              className="p-1.5 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Выйти из полноэкранного режима' : 'Во весь экран'}
              className="p-1.5 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition"
              title="Закрыть"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewport Container */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[300px] overflow-hidden select-none">
          {/* Stream Image */}
          {!hasError && (
            <img
              src={streamUrl}
              alt={`Camera stream from ${printer.name}`}
              onLoad={() => setIsLoaded(true)}
              onError={() => {
                setIsLoaded(false);
                setHasError(true);
                apiClient
                  .get(`/printers/${printer.id}/camera/status`)
                  .then((res) => setCameraStatus(res.data))
                  .catch(() => {});
              }}
              className={`w-full h-full object-contain transition-opacity duration-300 ${
                isLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
          )}

          {/* Loading Indicator */}
          {!isLoaded && !hasError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-slate-950/90">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">Установка соединения с камерой...</p>
                <p className="text-xs text-slate-400 max-w-xs">
                  {isBambu
                    ? 'Запрос зашифрованного TLS-потока на порту 6000'
                    : 'Запрос видеопотока со встроенного медиасервера'}
                </p>
              </div>
            </div>
          )}

          {/* Error Fallback */}
          {hasError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-slate-950/95">
              <div
                className={`p-3 rounded-full border ${
                  cameraStatus?.rateLimited
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}
              >
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">
                  {cameraStatus?.rateLimited
                    ? 'Камера Anycubic временно заблокирована (429)'
                    : 'Камера временно недоступна'}
                </p>
                <p className="text-xs text-slate-400 max-w-sm">
                  {cameraStatus?.rateLimited
                    ? 'Встроенный медиасервер принтера временно заблокировал частые подключения (Too Many Requests). Ограничение снимется автоматически (~40 мин) или после перезагрузки принтера (не перезагружайте во время активной печати!).'
                    : cameraStatus?.errorMessage ||
                      'Принтер выключен, находится в режиме глубокого сна или видеопоток не транслируется в локальную сеть.'}
                </p>
              </div>
              <button
                onClick={handleReconnect}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition border border-slate-700"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Повторить попытку</span>
              </button>
            </div>
          )}

          {/* Telemetry Overlay (bottom on stream) */}
          {isLoaded && !hasError && (
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
              <div className="flex items-center gap-2 pointer-events-auto bg-slate-950/80 backdrop-blur-md border border-slate-800/80 rounded-xl px-2.5 py-1.5 text-[11px] text-white">
                <span className="flex items-center gap-1 text-rose-400 font-medium">
                  <Flame className="w-3 h-3" />
                  <span>{printer.nozzleTemp !== null ? `${Math.round(printer.nozzleTemp)}°C` : '—'}</span>
                </span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1 text-amber-400 font-medium">
                  <Zap className="w-3 h-3" />
                  <span>{printer.bedTemp !== null ? `${Math.round(printer.bedTemp)}°C` : '—'}</span>
                </span>
                {isPrinting && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span className="flex items-center gap-1 text-emerald-400 font-bold">
                      <Activity className="w-3 h-3" />
                      <span>{progress}%</span>
                    </span>
                  </>
                )}
              </div>

              {printer.currentFile && (
                <div className="hidden sm:flex items-center gap-1.5 pointer-events-auto bg-slate-950/80 backdrop-blur-md border border-slate-800/80 rounded-xl px-2.5 py-1.5 text-[11px] text-slate-300 max-w-[200px] truncate">
                  <FileCode className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="truncate">{printer.currentFile}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 bg-slate-950/60 shrink-0">
          <button
            onClick={handleDownloadSnapshot}
            disabled={downloading || hasError}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl transition shadow-md shadow-emerald-600/20"
          >
            {downloading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>Сохранить снимок</span>
          </button>

          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
