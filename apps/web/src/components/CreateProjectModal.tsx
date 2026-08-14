import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateProjectSchema, CreateProjectDto } from '@printerp/shared';
import { useCreateProject } from '../hooks/useProjects';
import { useFilaments } from '../hooks/useFilaments';
import { X, Box, Plus, Trash2, Loader2, Calculator, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ isOpen, onClose }) => {
  const createProject = useCreateProject();
  const { data: filaments } = useFilaments();

  const [selectedFilaments, setSelectedFilaments] = useState<{ filamentId: string; grams: number | '' }[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateProjectDto>({
    resolver: zodResolver(CreateProjectSchema),
    defaultValues: {
      defaultPrice: 120000,
      extraCost: 0,
    },
  });

  const watchedExtraCost = watch('extraCost') || 0;

  if (!isOpen) return null;

  const addFilamentRow = () => {
    if (filaments && filaments.length > 0) {
      setSelectedFilaments([...selectedFilaments, { filamentId: filaments[0].id, grams: 50 }]);
    }
  };

  const removeFilamentRow = (index: number) => {
    setSelectedFilaments(selectedFilaments.filter((_, i) => i !== index));
  };

  const updateFilamentRow = (index: number, field: 'filamentId' | 'grams', value: string | number) => {
    const updated = [...selectedFilaments];
    if (field === 'filamentId') updated[index].filamentId = value as string;
    if (field === 'grams') {
      updated[index].grams = value === '' ? '' : isNaN(Number(value)) ? '' : Number(value);
    }
    setSelectedFilaments(updated);
  };

  // Live client-side preview of automatic material cost
  const filamentMap = new Map((filaments || []).map((f) => [f.id, f]));
  let estimatedMaterialCost = 0;
  let estimatedWeight = 0;

  for (const item of selectedFilaments) {
    const fil = filamentMap.get(item.filamentId);
    if (fil) {
      const rowGrams = Number(item.grams) || 0;
      estimatedWeight += rowGrams;
      const costPerGram = Number(fil.costPerGram) || 0;
      estimatedMaterialCost += rowGrams * costPerGram;
    }
  }

  const estimatedTotalCost = Math.round(estimatedMaterialCost) + Number(watchedExtraCost || 0);

  const onSubmit = async (data: CreateProjectDto) => {
    try {
      await createProject.mutateAsync({
        ...data,
        modelUrl: data.modelUrl || null,
        imageUrl: data.imageUrl || null,
        notes: data.notes || null,
        filaments: selectedFilaments.map((f) => ({
          filamentId: f.filamentId,
          grams: Number(f.grams) || 0,
        })),
      });
      reset();
      setSelectedFilaments([]);
      onClose();
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-start justify-center p-4 pt-[max(1.5rem,var(--tg-content-safe-area-inset-top,0px),calc(env(safe-area-inset-top,0px)+3.5rem))] pb-20 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-5 shadow-2xl space-y-4 mb-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Box className="w-4 h-4 text-indigo-400" />
            Добавить 3D-модель в каталог
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Название модели *</label>
            <input
              {...register('name')}
              placeholder="напр. Подвижный дракон"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
            {errors.name && <p className="text-[11px] text-red-400 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Описание модели</label>
            <textarea
              {...register('description')}
              rows={2}
              placeholder="Описание модели..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Links & Media Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <LinkIcon className="w-3.5 h-3.5 text-indigo-400" />
                Ссылка на модель (URL)
              </label>
              <input
                {...register('modelUrl')}
                placeholder="https://printables.com/..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
              {errors.modelUrl && <p className="text-[11px] text-red-400 mt-1">{errors.modelUrl.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                Ссылка на фото (URL)
              </label>
              <input
                {...register('imageUrl')}
                placeholder="https://imgur.com/photo.png"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
              {errors.imageUrl && <p className="text-[11px] text-red-400 mt-1">{errors.imageUrl.message}</p>}
            </div>
          </div>

          {/* Filament Consumption Rows */}
          <div className="border border-slate-800 rounded-xl p-3 bg-slate-950/50 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                Расход филамента
              </label>
              <button
                type="button"
                onClick={addFilamentRow}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Добавить филамент
              </button>
            </div>

            {selectedFilaments.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic">Филамент пока не добавлен.</p>
            ) : (
              <div className="space-y-2">
                {selectedFilaments.map((row, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <select
                      value={row.filamentId}
                      onChange={(e) => updateFilamentRow(idx, 'filamentId', e.target.value)}
                      className="flex-1 min-w-0 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white truncate focus:border-indigo-500 focus:outline-none"
                    >
                      {(filaments || []).map((fil) => (
                        <option key={fil.id} value={fil.id}>
                          {fil.brand} {fil.name} ({fil.material})
                        </option>
                      ))}
                    </select>

                    <div className="w-28 sm:w-32 shrink-0 flex items-center bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 focus-within:border-indigo-500">
                      <input
                        type="number"
                        value={row.grams}
                        onChange={(e) => updateFilamentRow(idx, 'grams', e.target.value)}
                        placeholder="Граммы"
                        className="w-full min-w-0 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                      />
                      <span className="text-[11px] font-semibold text-slate-400 ml-1 shrink-0">г</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFilamentRow(idx)}
                      className="text-slate-500 hover:text-red-400 p-1 shrink-0"
                      title="Удалить филамент"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Metric preview box */}
            <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Общий вес: <strong className="text-white">{estimatedWeight} г</strong></span>
              <span className="text-slate-400 flex items-center gap-1">
                <Calculator className="w-3 h-3 text-indigo-400" />
                Себестоимость: <strong className="text-emerald-400">{estimatedTotalCost.toLocaleString('ru-RU')} сум</strong>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Цена продажи клиенту (сум) *</label>
              <input
                {...register('defaultPrice', { valueAsNumber: true })}
                type="number"
                placeholder="120000"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
              {errors.defaultPrice && <p className="text-[11px] text-red-400 mt-1">{errors.defaultPrice.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Доп. фурнитура / расходы (сум)</label>
              <input
                {...register('extraCost', { valueAsNumber: true })}
                type="number"
                placeholder="0"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Время (мин)</label>
              <input
                {...register('printTimeMinutes', { valueAsNumber: true })}
                type="number"
                placeholder="240"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Размер X (мм)</label>
              <input
                {...register('sizeXMm', { valueAsNumber: true })}
                type="number"
                placeholder="120"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Размер Y (мм)</label>
              <input
                {...register('sizeYMm', { valueAsNumber: true })}
                type="number"
                placeholder="80"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Размер Z (мм)</label>
              <input
                {...register('sizeZMm', { valueAsNumber: true })}
                type="number"
                placeholder="150"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Заметки и параметры печати</label>
            <textarea
              {...register('notes')}
              rows={2}
              placeholder="Параметры печати, заполнение, поддержки..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
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
              disabled={createProject.isPending}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition shadow-md shadow-indigo-500/20"
            >
              {createProject.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Сохранить модель</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
