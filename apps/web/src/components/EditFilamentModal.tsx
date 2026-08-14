import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UpdateFilamentSchema, UpdateFilamentDto, FilamentMaterial } from '@printerp/shared';
import { Filament, useUpdateFilament, useDeleteFilament } from '../hooks/useFilaments';
import { X, Palette, Loader2, Trash2 } from 'lucide-react';

interface EditFilamentModalProps {
  filament: Filament | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EditFilamentModal: React.FC<EditFilamentModalProps> = ({ filament, isOpen, onClose }) => {
  const updateFilament = useUpdateFilament();
  const deleteFilament = useDeleteFilament();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateFilamentDto>({
    resolver: zodResolver(UpdateFilamentSchema),
  });

  useEffect(() => {
    if (filament) {
      reset({
        brand: filament.brand,
        name: filament.name,
        material: filament.material,
        color: filament.color || '#3b82f6',
        pricePerSpool: Number(filament.pricePerSpool),
        spoolWeightG: filament.spoolWeightG,
        stockG: filament.stockG !== null ? filament.stockG : undefined,
        notes: filament.notes || '',
      });
    }
  }, [filament, reset]);

  if (!isOpen || !filament) return null;

  const onSubmit = async (data: UpdateFilamentDto) => {
    try {
      await updateFilament.mutateAsync({
        id: filament.id,
        dto: data,
      });
      onClose();
    } catch (err: any) {
      console.error('Failed to update filament:', err);
      alert(err.response?.data?.message || 'Ошибка обновления филамента');
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Вы уверены, что хотите удалить "${filament.brand} ${filament.name}"?`)) {
      try {
        await deleteFilament.mutateAsync(filament.id);
        onClose();
      } catch (err: any) {
        console.error('Failed to delete filament:', err);
        alert(err.response?.data?.message || 'Ошибка удаления филамента');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-start justify-center p-4 pt-[max(1.5rem,var(--tg-content-safe-area-inset-top,0px),calc(env(safe-area-inset-top,0px)+3.5rem))] pb-20 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-5 shadow-2xl space-y-4 mb-8">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Palette className="w-4 h-4 text-indigo-400" />
            Редактировать катушку филамента
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Бренд *</label>
              <input
                {...register('brand')}
                placeholder="напр. Bambu Lab"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
              {errors.brand && <p className="text-[11px] text-red-400 mt-1">{errors.brand.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Название / Цвет *</label>
              <input
                {...register('name')}
                placeholder="напр. PLA Basic Черный"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
              {errors.name && <p className="text-[11px] text-red-400 mt-1">{errors.name.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Материал</label>
              <select
                {...register('material')}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value={FilamentMaterial.PLA}>PLA</option>
                <option value={FilamentMaterial.PETG}>PETG</option>
                <option value={FilamentMaterial.ABS}>ABS</option>
                <option value={FilamentMaterial.ASA}>ASA</option>
                <option value={FilamentMaterial.TPU}>TPU</option>
                <option value={FilamentMaterial.OTHER}>Другой</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Цвет (метка)</label>
              <input
                {...register('color')}
                type="color"
                className="w-full bg-slate-950 border border-slate-800 h-9 rounded-xl px-1 py-1 cursor-pointer focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Цена катушки (сум) *</label>
              <input
                {...register('pricePerSpool', { valueAsNumber: true })}
                type="number"
                placeholder="250000"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
              {errors.pricePerSpool && <p className="text-[11px] text-red-400 mt-1">{errors.pricePerSpool.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Вес нетто (г) *</label>
              <input
                {...register('spoolWeightG', { valueAsNumber: true })}
                type="number"
                placeholder="1000"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
              {errors.spoolWeightG && <p className="text-[11px] text-red-400 mt-1">{errors.spoolWeightG.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Остаток (г)</label>
              <input
                {...register('stockG', { valueAsNumber: true })}
                type="number"
                placeholder="1000"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Заметки</label>
            <textarea
              {...register('notes')}
              rows={2}
              placeholder="Рекомендованная температура, сопло..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteFilament.isPending}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 flex items-center gap-1 transition"
            >
              {deleteFilament.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              <span>Удалить</span>
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-xl text-xs text-slate-400 hover:bg-slate-800"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={updateFilament.isPending}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition shadow-md shadow-indigo-500/20"
              >
                {updateFilament.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Сохранить</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
