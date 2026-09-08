import React, { useState, useEffect } from 'react';
import {
  X,
  Trash2,
  Scale,
  FileText,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useFilaments } from '../hooks/useFilaments';
import { useCreateScrapRecord, ScrapReason, ScrapReasonLabels } from '../hooks/useScrap';

interface ScrapFilamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultFilamentId?: string;
}

export const ScrapFilamentModal: React.FC<ScrapFilamentModalProps> = ({
  isOpen,
  onClose,
  defaultFilamentId,
}) => {
  const { data: filaments } = useFilaments();
  const createScrap = useCreateScrapRecord();

  const [filamentId, setFilamentId] = useState<string>('');
  const [grams, setGrams] = useState<number>(30);
  const [reason, setReason] = useState<ScrapReason>(ScrapReason.PURGE_WASTE);
  const [comment, setComment] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      if (defaultFilamentId) {
        setFilamentId(defaultFilamentId);
      } else if (filaments && filaments.length > 0) {
        setFilamentId(filaments[0].id);
      }
      setGrams(30);
      setReason(ScrapReason.PURGE_WASTE);
      setComment('');
    }
  }, [isOpen, defaultFilamentId, filaments]);

  if (!isOpen) return null;

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
      setErrorMsg('Укажите корректный вес в граммах');
      return;
    }

    try {
      await createScrap.mutateAsync({
        filamentId,
        grams,
        reason,
        comment: comment.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Ошибка при списании филамента');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Списание филамента
              </h2>
              <p className="text-xs text-slate-400">
                Продувка сопла, калибровка, обрезки
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
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
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
                Вес списания (г) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={grams || ''}
                  onChange={(e) => setGrams(Math.max(1, parseInt(e.target.value) || 0))}
                  placeholder="Вес в граммах"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  required
                />
                <span className="absolute right-3 top-2.5 text-[10px] text-slate-400 font-semibold">
                  грамм
                </span>
              </div>
            </div>

            {/* Defect/Scrap Reason */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Причина *
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as ScrapReason)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                {Object.entries(ScrapReasonLabels).map(([key, label]) => (
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
              Комментарий (необязательно)
            </label>
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="напр. чистка сопла перед PETG"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Summary Box */}
          <div className="bg-amber-950/20 border border-amber-900/30 rounded-xl p-3 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Остаток после списания:</span>
              <span className="text-amber-300 font-bold">
                {selectedFilament?.stockG !== null && selectedFilament?.stockG !== undefined
                  ? `${Math.max(0, selectedFilament.stockG - grams)} г (было ${selectedFilament.stockG} г)`
                  : '—'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[11px]">Сумма расхода:</span>
              <span className="text-amber-400 font-bold font-mono">
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
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-amber-600/20"
            >
              {createScrap.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>Списать филамент</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
