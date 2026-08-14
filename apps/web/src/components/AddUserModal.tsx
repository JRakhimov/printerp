import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateUserSchema, CreateUserDto, Role } from '@printerp/shared';
import { useCreateUser } from '../hooks/useUsers';
import { X, UserPlus, Shield, Loader2, Send } from 'lucide-react';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddUserModal: React.FC<AddUserModalProps> = ({ isOpen, onClose }) => {
  const createUser = useCreateUser();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateUserDto>({
    resolver: zodResolver(CreateUserSchema),
    defaultValues: {
      role: Role.USER,
    },
  });

  if (!isOpen) return null;

  const onSubmit = async (data: CreateUserDto) => {
    try {
      await createUser.mutateAsync(data);
      reset();
      onClose();
    } catch (err: any) {
      console.error('Failed to add user to allowlist:', err);
      alert(err.response?.data?.message || 'Ошибка добавления сотрудника в команду');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-start justify-center p-4 pt-[max(1.5rem,var(--tg-content-safe-area-inset-top,0px),calc(env(safe-area-inset-top,0px)+3.5rem))] pb-20 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-5 shadow-2xl space-y-4 mb-8">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-amber-400" />
            Добавить сотрудника в команду
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Telegram ID (числовой) *
            </label>
            <input
              {...register('telegramId')}
              placeholder="напр. 123456789"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
            />
            {errors.telegramId && <p className="text-[11px] text-red-400 mt-1">{errors.telegramId.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
              <Send className="w-3.5 h-3.5 text-sky-400" />
              Telegram Username (без @)
            </label>
            <input
              {...register('telegramUsername')}
              placeholder="напр. operator_ivan"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Имя</label>
              <input
                {...register('firstName')}
                placeholder="Иван"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Фамилия</label>
              <input
                {...register('lastName')}
                placeholder="Иванов"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              Роль *
            </label>
            <select
              {...register('role')}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
            >
              <option value={Role.USER}>СОТРУДНИК (Оператор мастерской)</option>
              <option value={Role.OWNER}>ВЛАДЕЛЕЦ (Полный доступ к настройкам)</option>
            </select>
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
              disabled={createUser.isPending}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 transition shadow-md shadow-amber-500/20"
            >
              {createUser.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Добавить в список</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
