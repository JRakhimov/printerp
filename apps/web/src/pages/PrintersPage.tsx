import React, { useState } from 'react';
import {
  usePrinters,
  useDeletePrinter,
  useTestPrinterConnection,
} from '../hooks/usePrinters';
import { CreatePrinterModal } from '../components/CreatePrinterModal';
import { EditPrinterModal } from '../components/EditPrinterModal';
import { PrinterResponse } from '@printerp/shared';
import {
  Printer as PrinterIcon,
  Plus,
  Wifi,
  Flame,
  Clock,
  FileCode,
  Pencil,
  Trash2,
  Loader2,
  RefreshCw,
  Zap,
} from 'lucide-react';

export const PrintersPage: React.FC = () => {
  const { data: printers, isLoading, refetch, isRefetching } = usePrinters();
  const deletePrinter = useDeletePrinter();
  const testConnection = useTestPrinterConnection();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<PrinterResponse | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testMessages, setTestMessages] = useState<Record<string, { success: boolean; message: string }>>({});

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Вы действительно хотите удалить принтер "${name}" из списка?`)) {
      await deletePrinter.mutateAsync(id);
    }
  };

  const handleTestSingleLink = async (printer: PrinterResponse) => {
    if (!printer.ipAddress || !printer.accessCode) {
      alert('Пожалуйста, сначала настройте IP-адрес и код доступа LAN Access Code для этого принтера.');
      return;
    }

    setTestingId(printer.id);
    try {
      const res = await testConnection.mutateAsync({
        ipAddress: printer.ipAddress,
        accessCode: printer.accessCode,
        serialNumber: printer.serialNumber || undefined,
      });
      setTestMessages((prev) => ({
        ...prev,
        [printer.id]: { success: res.success, message: res.message },
      }));
      refetch();
    } catch (err: any) {
      setTestMessages((prev) => ({
        ...prev,
        [printer.id]: {
          success: false,
          message: err.response?.data?.message || 'Ошибка подключения',
        },
      }));
    } finally {
      setTestingId(null);
    }
  };

  const totalPrinters = printers?.length || 0;
  const printingCount = printers?.filter((p) => p.lastStatus === 'RUNNING' || p.lastStatus === 'PRINTING').length || 0;
  const idleCount = printers?.filter((p) => p.lastStatus === 'IDLE' || !p.lastStatus).length || 0;

  return (
    <div className="space-y-4 pb-20">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <PrinterIcon className="w-5 h-5 text-emerald-400" />
            3D-Принтеры Bambu Lab
          </h2>
          <p className="text-xs text-slate-400">Телеметрия по локальному MQTT и мониторинг печати</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-xl transition"
            title="Обновить телеметрию"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-2 rounded-xl transition shadow-md shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Добавить принтер</span>
          </button>
        </div>
      </div>

      {/* Fleet Metric Badges */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col items-center text-center">
          <span className="text-[11px] text-slate-400 font-medium">Всего принтеров</span>
          <span className="text-lg font-black text-white">{totalPrinters}</span>
        </div>
        <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-3 flex flex-col items-center text-center">
          <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            В печати
          </span>
          <span className="text-lg font-black text-emerald-300">{printingCount}</span>
        </div>
        <div className="bg-sky-950/40 border border-sky-800/40 rounded-xl p-3 flex flex-col items-center text-center">
          <span className="text-[11px] text-sky-400 font-medium">В ожидании</span>
          <span className="text-lg font-black text-sky-300">{idleCount}</span>
        </div>
      </div>

      {/* Printer List */}
      {isLoading ? (
        <div className="py-12 flex justify-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
        </div>
      ) : printers?.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
            <PrinterIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Принтеры Bambu Lab не подключены</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
              Добавьте ваш Bambu Lab (P1S, X1C, A1 и др.) с помощью его локального IP-адреса и кода доступа LAN Access Code.
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-md shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Подключить первый принтер</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {printers?.map((printer) => {
            const isPrinting = printer.lastStatus === 'RUNNING' || printer.lastStatus === 'PRINTING';
            const isIdle = printer.lastStatus === 'IDLE' || !printer.lastStatus;
            const isPaused = printer.lastStatus === 'PAUSED';
            const isFinished = printer.lastStatus === 'FINISH';

            const progress = printer.printProgress ?? 0;
            const remainingMins = printer.remainingMinutes ?? 0;
            const hours = Math.floor(remainingMins / 60);
            const mins = remainingMins % 60;
            const timeString = hours > 0 ? `${hours}ч ${mins}м` : `${mins}м`;

            const statusText = isPrinting
              ? 'ПЕЧАТЬ'
              : isPaused
              ? 'ПАУЗА'
              : isFinished
              ? 'ЗАВЕРШЕНО'
              : printer.lastStatus === 'OFFLINE'
              ? 'ОФФЛАЙН'
              : printer.lastStatus || 'ГОТОВ';

            const testMsg = testMessages[printer.id];

            return (
              <div
                key={printer.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 hover:border-slate-700 transition shadow-sm"
              >
                {/* Header: Name, Model & Status Badge */}
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">{printer.name}</h3>
                      <span className="text-[10px] font-semibold bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700">
                        {printer.model}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                      <Wifi className="w-3 h-3 text-sky-400" />
                      {printer.ipAddress ? `${printer.ipAddress}:8883` : 'IP не указан'}
                      {printer.serialNumber && ` • SN: ${printer.serialNumber}`}
                    </p>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
                        isPrinting
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : isPaused
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : isFinished
                          ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isPrinting
                            ? 'bg-emerald-400 animate-pulse'
                            : isPaused
                            ? 'bg-amber-400'
                            : isFinished
                            ? 'bg-purple-400'
                            : 'bg-slate-400'
                        }`}
                      />
                      {statusText}
                    </span>
                  </div>
                </div>

                {/* Live Progress Bar (if active or progress > 0) */}
                {isPrinting && (
                  <div className="space-y-1.5 bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium flex items-center gap-1.5 truncate max-w-[200px]">
                        <FileCode className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">{printer.currentFile || 'Печать задания'}</span>
                      </span>
                      <span className="font-bold text-emerald-400">{progress}%</span>
                    </div>

                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Telemetry Stats: Temps & Time */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {/* Nozzle Temp */}
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2 flex items-center gap-2">
                    <div className="p-1.5 bg-rose-500/10 rounded-lg text-rose-400">
                      <Flame className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-medium">Сопло</p>
                      <p className="font-bold text-white">
                        {printer.nozzleTemp !== null && printer.nozzleTemp !== undefined
                          ? `${Math.round(printer.nozzleTemp)}°C`
                          : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Bed Temp */}
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2 flex items-center gap-2">
                    <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-400">
                      <Zap className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-medium">Стол</p>
                      <p className="font-bold text-white">
                        {printer.bedTemp !== null && printer.bedTemp !== undefined
                          ? `${Math.round(printer.bedTemp)}°C`
                          : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Remaining Time */}
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2 flex items-center gap-2">
                    <div className="p-1.5 bg-sky-500/10 rounded-lg text-sky-400">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-medium">Осталось</p>
                      <p className="font-bold text-white">
                        {isPrinting && remainingMins > 0 ? timeString : '—'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Test Result Message (if tested) */}
                {testMsg && (
                  <div
                    className={`p-2 rounded-xl text-[11px] flex items-center gap-1.5 border ${
                      testMsg.success
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                    }`}
                  >
                    <span>{testMsg.message}</span>
                  </div>
                )}

                {/* Actions Toolbar */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                  <button
                    onClick={() => handleTestSingleLink(printer)}
                    disabled={testingId === printer.id}
                    className="px-2.5 py-1.5 text-[11px] font-semibold bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl flex items-center gap-1.5 transition"
                  >
                    {testingId === printer.id ? (
                      <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                    ) : (
                      <Wifi className="w-3 h-3 text-sky-400" />
                    )}
                    <span>Проверить связь</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setEditingPrinter(printer)}
                      className="p-1.5 text-slate-400 hover:text-white bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl transition"
                      title="Редактировать принтер"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(printer.id, printer.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl transition"
                      title="Удалить принтер"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <CreatePrinterModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
      <EditPrinterModal
        printer={editingPrinter}
        isOpen={!!editingPrinter}
        onClose={() => setEditingPrinter(null)}
      />
    </div>
  );
};
