import React, { useState } from 'react';
import { useFilaments, useDeleteFilament, Filament } from '../hooks/useFilaments';
import { CreateFilamentModal } from '../components/CreateFilamentModal';
import { EditFilamentModal } from '../components/EditFilamentModal';
import { ScrapFilamentModal } from '../components/ScrapFilamentModal';
import {
  Palette,
  Plus,
  Search,
  Trash2,
  Loader2,
  ChevronLeft,
  Pencil,
  MinusCircle,
} from 'lucide-react';

export interface FilamentsPageProps {
  onBack?: () => void;
}

export const FilamentsPage: React.FC<FilamentsPageProps> = ({ onBack }) => {
  const [search, setSearch] = useState('');
  const [isFilamentModalOpen, setIsFilamentModalOpen] = useState(false);
  const [selectedFilament, setSelectedFilament] = useState<Filament | null>(null);
  const [isScrapModalOpen, setIsScrapModalOpen] = useState(false);
  const [scrapFilamentId, setScrapFilamentId] = useState<string | undefined>(undefined);

  const filamentsQuery = useFilaments(search);
  const deleteFilament = useDeleteFilament();

  const handleDeleteFilament = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (confirm(`Вы уверены, что хотите удалить филамент "${name}"?`)) {
      await deleteFilament.mutateAsync(id);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center justify-between">
        {onBack ? (
          <button
            onClick={onBack}
            className="flex items-center space-x-1 text-xs text-slate-400 hover:text-white"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Назад</span>
          </button>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setScrapFilamentId(undefined);
              setIsScrapModalOpen(true);
            }}
            className="flex items-center space-x-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-orange-300 border border-amber-500/30 text-xs font-semibold px-3 py-1.5 rounded-xl transition shadow-sm"
            title="Списать продувку Bambu Lab, калибровку или брак"
          >
            <MinusCircle className="w-3.5 h-3.5" />
            <span>Списать</span>
          </button>
          <button
            onClick={() => setIsFilamentModalOpen(true)}
            className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition shadow-md shadow-indigo-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Добавить филамент</span>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Palette className="w-5 h-5 text-indigo-400" />
          Склад филамента
        </h2>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск филамента по бренду или названию..."
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {filamentsQuery.isLoading && (
        <div className="py-12 flex justify-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        </div>
      )}

      <div className="space-y-2.5">
        {filamentsQuery.data?.map((fil) => (
          <div
            key={fil.id}
            onClick={() => setSelectedFilament(fil)}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-sm cursor-pointer transition"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center space-x-2.5">
                <span
                  className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm shrink-0"
                  style={{ backgroundColor: fil.color || '#3b82f6' }}
                />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {fil.brand} {fil.name}
                  </h3>
                  <p className="text-xs text-slate-400">{fil.material} • катушка {fil.spoolWeightG}г</p>
                </div>
              </div>

              <div className="flex items-center space-x-1.5 shrink-0">
                <div className="text-right mr-1">
                  <span className="text-xs font-bold text-white block">{Number(fil.pricePerSpool).toLocaleString('ru-RU')} сум</span>
                  <span className="text-[10px] text-emerald-400">{Number(fil.costPerGram).toLocaleString('ru-RU')} сум/г</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setScrapFilamentId(fil.id);
                    setIsScrapModalOpen(true);
                  }}
                  className="text-slate-400 hover:text-amber-400 p-1"
                  title="Списать пластик с катушки (продувка/брак)"
                >
                  <MinusCircle className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFilament(fil);
                  }}
                  className="text-slate-400 hover:text-indigo-400 p-1"
                  title="Редактировать филамент"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => handleDeleteFilament(e, fil.id, `${fil.brand} ${fil.name}`)}
                  className="text-slate-500 hover:text-red-400 p-1"
                  title="Удалить филамент"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Остаток на складе:</span>
              {fil.stockG !== null ? (
                <span
                  className={`font-bold px-2 py-0.5 rounded-lg text-xs ${
                    fil.stockG <= 0
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      : fil.stockG < 200
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}
                >
                  {fil.stockG} г
                </span>
              ) : (
                <span className="text-slate-500 italic">не указан</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <CreateFilamentModal isOpen={isFilamentModalOpen} onClose={() => setIsFilamentModalOpen(false)} />
      <EditFilamentModal
        filament={selectedFilament}
        isOpen={!!selectedFilament}
        onClose={() => setSelectedFilament(null)}
      />
      <ScrapFilamentModal
        isOpen={isScrapModalOpen}
        onClose={() => {
          setIsScrapModalOpen(false);
          setScrapFilamentId(undefined);
        }}
        defaultFilamentId={scrapFilamentId}
      />
    </div>
  );
};
