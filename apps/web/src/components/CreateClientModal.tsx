import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateClientSchema, CreateClientDto, ClientSource } from '@printerp/shared';
import { useCreateClient } from '../hooks/useClients';
import { CityInput } from './CityInput';
import { X, UserPlus, Loader2 } from 'lucide-react';

interface CreateClientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateClientModal: React.FC<CreateClientModalProps> = ({ isOpen, onClose }) => {
  const createClient = useCreateClient();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateClientDto>({
    resolver: zodResolver(CreateClientSchema),
    defaultValues: {
      source: ClientSource.INSTAGRAM,
      city: 'Ташкент',
    },
  });

  if (!isOpen) return null;

  const onSubmit = async (data: CreateClientDto) => {
    try {
      await createClient.mutateAsync(data);
      reset();
      onClose();
    } catch (err) {
      console.error('Failed to create client:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-start justify-center p-4 pt-[max(1.5rem,var(--tg-content-safe-area-inset-top,0px),calc(env(safe-area-inset-top,0px)+3.5rem))] pb-20 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-5 shadow-2xl space-y-4 mb-8">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-blue-400" />
            Добавить нового клиента
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          {/* Row 1: Instagram | City */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Instagram</label>
              <input
                {...register('instagramUsername')}
                placeholder="@insta_handle"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Город / Область</label>
              <Controller
                control={control}
                name="city"
                render={({ field }) => (
                  <CityInput
                    id="create-client-city"
                    value={field.value || ''}
                    onChange={field.onChange}
                    placeholder="напр. Ташкент"
                  />
                )}
              />
            </div>
          </div>

          {/* Row 2: Full Name | Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Имя / ФИО</label>
              <input
                {...register('name')}
                placeholder="напр. Александр (необязательно)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Телефон</label>
              <input
                {...register('phone')}
                placeholder="+998 90 123-45-67"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Row 3: Telegram | Source */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Telegram</label>
              <input
                {...register('telegramUsername')}
                placeholder="@username"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Источник</label>
              <select
                {...register('source')}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
              >
                <option value={ClientSource.INSTAGRAM}>Instagram</option>
                <option value={ClientSource.TELEGRAM}>Telegram</option>
                <option value={ClientSource.FRIEND}>Рекомендация / Друзья</option>
                <option value={ClientSource.REPEAT_CLIENT}>Постоянный клиент</option>
                <option value={ClientSource.OTHER}>Другое</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Заметки</label>
            <textarea
              {...register('notes')}
              rows={2}
              placeholder="Дополнительные сведения о клиенте..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
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
              disabled={createClient.isPending}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 transition shadow-md shadow-blue-500/20"
            >
              {createClient.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Сохранить клиента</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
