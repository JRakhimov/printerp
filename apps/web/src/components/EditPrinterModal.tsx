import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UpdatePrinterSchema, UpdatePrinterDto, PrinterResponse } from '@printerp/shared';
import { useUpdatePrinter, useTestPrinterConnection } from '../hooks/usePrinters';
import {
  X,
  Printer as PrinterIcon,
  Wifi,
  KeyRound,
  Hash,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Activity,
} from 'lucide-react';

interface EditPrinterModalProps {
  printer: PrinterResponse | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EditPrinterModal: React.FC<EditPrinterModalProps> = ({
  printer,
  isOpen,
  onClose,
}) => {
  const updatePrinter = useUpdatePrinter();
  const testConnection = useTestPrinterConnection();

  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<UpdatePrinterDto>({
    resolver: zodResolver(UpdatePrinterSchema),
  });

  useEffect(() => {
    if (printer) {
      reset({
        name: printer.name,
        model: printer.model,
        ipAddress: printer.ipAddress || '',
        accessCode: printer.accessCode || '',
        serialNumber: printer.serialNumber || '',
        isActive: printer.isActive,
      });
      setTestResult(null);
    }
  }, [printer, reset]);

  const ipAddress = watch('ipAddress');
  const accessCode = watch('accessCode');
  const serialNumber = watch('serialNumber');

  if (!isOpen || !printer) return null;

  const handleTestLink = async () => {
    if (!ipAddress || !accessCode) {
      setTestResult({
        success: false,
        message: 'Введите IP-адрес и код доступа LAN Access Code для проверки.',
      });
      return;
    }

    try {
      const res = await testConnection.mutateAsync({
        ipAddress,
        accessCode,
        serialNumber: serialNumber || undefined,
      });
      setTestResult({
        success: res.success,
        message: res.message,
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.response?.data?.message || 'Ошибка подключения. Проверьте IP и код доступа.',
      });
    }
  };

  const onSubmit = async (data: UpdatePrinterDto) => {
    try {
      await updatePrinter.mutateAsync({ id: printer.id, dto: data });
      onClose();
    } catch (err: any) {
      console.error('Failed to update printer:', err);
      alert(err.response?.data?.message || 'Ошибка обновления принтера');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-start justify-center p-4 pt-[max(1.5rem,var(--tg-content-safe-area-inset-top,0px),calc(env(safe-area-inset-top,0px)+3.5rem))] pb-20 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-5 shadow-2xl space-y-4 mb-8">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <PrinterIcon className="w-4 h-4 text-emerald-400" />
            Редактировать 3D-принтер Bambu Lab
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          {/* Printer Name & Model */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Название принтера *
              </label>
              <input
                {...register('name')}
                placeholder="напр. Bambu P1S #1"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
              {errors.name && <p className="text-[10px] text-red-400 mt-0.5">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Модель *
              </label>
              <select
                {...register('model')}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="P1S">Bambu Lab P1S</option>
                <option value="X1C">Bambu Lab X1-Carbon</option>
                <option value="A1">Bambu Lab A1</option>
                <option value="A1_MINI">Bambu Lab A1 Mini</option>
                <option value="P1P">Bambu Lab P1P</option>
                <option value="OTHER">Другая модель</option>
              </select>
            </div>
          </div>

          {/* IP Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
              <Wifi className="w-3.5 h-3.5 text-sky-400" />
              Локальный IP-адрес (LAN Mode)
            </label>
            <input
              {...register('ipAddress')}
              placeholder="напр. 192.168.1.120"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none font-mono"
            />
          </div>

          {/* LAN Access Code & Serial Number */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                LAN Access Code
              </label>
              <input
                {...register('accessCode')}
                placeholder="напр. 12345678"
                type="password"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-emerald-400" />
                Серийный номер (SN) *
              </label>
              <input
                {...register('serialNumber')}
                placeholder="напр. 01P00A3B12345678"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none font-mono uppercase"
              />
            </div>
          </div>

          {/* Test Link Button & Result */}
          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                Проверка связи MQTT (порт 8883)
              </span>
              <button
                type="button"
                onClick={handleTestLink}
                disabled={testConnection.isPending}
                className="px-2.5 py-1 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1 transition"
              >
                {testConnection.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                ) : (
                  <Wifi className="w-3 h-3 text-sky-400" />
                )}
                <span>Проверить связь</span>
              </button>
            </div>

            {testResult && (
              <div
                className={`p-2 rounded-lg text-[11px] flex items-center gap-1.5 border ${
                  testResult.success
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl text-xs text-slate-400 hover:bg-slate-800"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={updatePrinter.isPending}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition shadow-md shadow-emerald-500/20"
            >
              {updatePrinter.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Сохранить</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
