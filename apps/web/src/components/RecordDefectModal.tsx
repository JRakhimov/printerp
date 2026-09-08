import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  RotateCcw,
  Scale,
  Printer as PrinterIcon,
  FileText,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { OrderItem } from '../hooks/useOrders';
import { useFilaments } from '../hooks/useFilaments';
import { usePrinters } from '../hooks/usePrinters';
import { useCreateScrapRecord, ScrapReason, ScrapReasonLabels } from '../hooks/useScrap';

interface RecordDefectModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: number;
  item: OrderItem | null;
}

export const RecordDefectModal: React.FC<RecordDefectModalProps> = ({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  item,
}) => {
  const { data: filaments } = useFilaments();
  const { data: printers } = usePrinters();
  const createScrap = useCreateScrapRecord();

  const [filamentId, setFilamentId] = useState<string>('');
  const [grams, setGrams] = useState<number>(50);
  const [reason, setReason] = useState<ScrapReason>(ScrapReason.BED_ADHESION);
  const [comment, setComment] = useState<string>('');
  const [reprint, setReprint] = useState<boolean>(true);
  const [reprintPrinterId, setReprintPrinterId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize values when item changes or modal opens
  useEffect(() => {
    if (isOpen && item) {
      setErrorMsg(null);
      // Try to find matching filament from project
      let initialFilamentId = '';
      let initialGrams = 50;

      const projectFilaments = (item.project as any)?.projectFilaments;
      if (projectFilaments && projectFilaments.length > 0) {
        initialFilamentId = projectFilaments[0].filamentId;
        initialGrams = projectFilaments[0].grams || item.project?.weightG || 50;
      } else if (item.project?.weightG) {
        initialGrams = item.project.weightG;
      }

      if (!initialFilamentId && filaments && filaments.length > 0) {
        initialFilamentId = filaments[0].id;
      }

      setFilamentId(initialFilamentId);
      setGrams(initialGrams);
      setReason(ScrapReason.BED_ADHESION);
      setComment('');
      setReprint(true);

      if (printers && printers.length > 0) {
        setReprintPrinterId(printers[0].id);
      }
    }
  }, [isOpen, item, filaments, printers]);

  if (!isOpen || !item) return null;

  const selectedFilament = filaments?.find((f) => f.id === filamentId);
  const costPerGram = selectedFilament ? Number(selectedFilament.costPerGram) : 0;
  const scrapCost = Math.round(grams * costPerGram);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filamentId) {
      setErrorMsg('Пожалуйста, выберите катушку филамента');
      return;
    }
    if (!grams || grams <= 0) {
      setErrorMsg('Укажите корректный вес брака в граммах');
      return;
    }

    try {
      await createScrap.mutateAsync({
        filamentId,
        grams,
        reason,
        comment: comment.trim() || undefined,
        orderId,
        orderItemId: item.id,
        reprint,
        reprintPrinterId: reprint ? reprintPrinterId || undefined : undefined,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Ошибка при сохранении брака');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Фиксация брака
                <span className="text-xs font-mono font-medium text-slate-400">
                  #{orderNumber}
                </span>
              </h2>
              <p className="text-xs text-slate-400 truncate max-w-xs">
                {item.projectNameSnapshot}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Filament Select */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Катушка филамента *
            </label>
            <select
              value={filamentId}
              onChange={(e) => setFilamentId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              required
            >
              <option value="" disabled>
                Выберите филамент...
              </option>
              {filaments?.map((fil) => (
                <option key={fil.id} value={fil.id}>
                  {fil.brand} {fil.name} ({fil.material}) — ост. {fil.stockG ?? '—'}г (по {Number(fil.costPerGram).toLocaleString('ru-RU')} сум/г)
                </option>
              ))}
            </select>
          </div>

          {/* Weight & Reason Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Grams */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                <Scale className="w-3.5 h-3.5 text-slate-400" />
                Вес брака (г) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={grams || ''}
                  onChange={(e) => setGrams(Math.max(1, parseInt(e.target.value) || 0))}
                  placeholder="Вес в граммах"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                  required
                />
                <span className="absolute right-3 top-2.5 text-[10px] text-slate-400 font-semibold">
                  грамм
                </span>
              </div>
            </div>

            {/* Defect Reason */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Причина брака *
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as ScrapReason)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              >
                {Object.entries(ScrapReasonLabels)
                  .filter(([key]) => key !== ScrapReason.PURGE_WASTE && key !== ScrapReason.CALIBRATION)
                  .map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Примечание (необязательно)
            </label>
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="напр. отрыв на высоте 40мм, забит экструдер"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Reprint Option */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-indigo-400" />
                <div>
                  <span className="text-xs font-bold text-white block">
                    Отправить на повторную печать
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    Создаст новую задачу в очереди печати выбранного принтера
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={reprint}
                onChange={(e) => setReprint(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700"
              />
            </label>

            {reprint && (
              <div className="pt-2 border-t border-slate-800/80 animate-fadeIn">
                <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <PrinterIcon className="w-3.5 h-3.5 text-slate-400" />
                  Принтер для повторной печати:
                </label>
                <select
                  value={reprintPrinterId}
                  onChange={(e) => setReprintPrinterId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {printers?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.model})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Summary Box */}
          <div className="bg-rose-950/20 border border-rose-900/30 rounded-xl p-3 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Будет списано со склада:</span>
              <span className="text-rose-300 font-bold">
                {grams} г &bull; {selectedFilament ? `${selectedFilament.brand} ${selectedFilament.name}` : ''}
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[11px]">Убыток от брака:</span>
              <span className="text-rose-400 font-bold font-mono">
                {scrapCost.toLocaleString('ru-RU')} сум
              </span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={createScrap.isPending}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-rose-600/20"
            >
              {createScrap.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>Зафиксировать брак и списать</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
