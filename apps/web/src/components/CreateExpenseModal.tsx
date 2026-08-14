import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CreateTransactionSchema,
  CreateTransactionDto,
  TransactionType,
  ExpenseCategory,
} from '@printerp/shared';
import { useCreateTransaction } from '../hooks/useFinance';
import { X, DollarSign, Loader2, Calendar, Tag, MessageSquare } from 'lucide-react';

interface CreateExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateExpenseModal: React.FC<CreateExpenseModalProps> = ({ isOpen, onClose }) => {
  const createTx = useCreateTransaction();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateTransactionDto>({
    resolver: zodResolver(CreateTransactionSchema),
    defaultValues: {
      type: TransactionType.EXPENSE,
      category: ExpenseCategory.OTHER,
      amount: 50000,
      date: new Date().toISOString().slice(0, 10),
    },
  });

  const currentType = watch('type');

  if (!isOpen) return null;

  const onSubmit = async (data: CreateTransactionDto) => {
    try {
      await createTx.mutateAsync({
        ...data,
        comment: data.comment || null,
      });
      reset();
      onClose();
    } catch (err) {
      console.error('Failed to create transaction:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-start justify-center p-4 pt-[max(1.5rem,var(--tg-content-safe-area-inset-top,0px),calc(env(safe-area-inset-top,0px)+3.5rem))] pb-20 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-5 shadow-2xl space-y-4 mb-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            Добавить операцию / расход
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          {/* Type Toggle: Expense / Income */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setValue('type', TransactionType.EXPENSE)}
              className={`py-1.5 rounded-lg text-xs font-bold transition ${
                currentType === TransactionType.EXPENSE
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Расход (-)
            </button>
            <button
              type="button"
              onClick={() => setValue('type', TransactionType.INCOME)}
              className={`py-1.5 rounded-lg text-xs font-bold transition ${
                currentType === TransactionType.INCOME
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Доход (+)
            </button>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Сумма (сум) *
            </label>
            <input
              {...register('amount', { valueAsNumber: true })}
              type="number"
              placeholder="50000"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none font-bold"
            />
            {errors.amount && <p className="text-[11px] text-red-400 mt-1">{errors.amount.message}</p>}
          </div>

          {/* Expense Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-indigo-400" />
              Категория *
            </label>
            <select
              {...register('category')}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value={ExpenseCategory.FILAMENT}>Закупка филамента</option>
              <option value={ExpenseCategory.ELECTRICITY}>Электричество</option>
              <option value={ExpenseCategory.PRINTER_PARTS}>Запчасти и обслуживание</option>
              <option value={ExpenseCategory.TOOLS}>Инструменты и аксессуары</option>
              <option value={ExpenseCategory.DELIVERY}>Упаковка и доставка</option>
              <option value={ExpenseCategory.OTHER}>Прочие расходы</option>
            </select>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              Дата
            </label>
            <input
              {...register('date')}
              type="date"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Comment / Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
              Описание / Комментарий
            </label>
            <textarea
              {...register('comment')}
              rows={2}
              placeholder="напр. Покупка 2 катушек PETG, сопло 0.4мм..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Actions */}
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
              disabled={createTx.isPending}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition shadow-md shadow-emerald-500/20"
            >
              {createTx.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Сохранить запись</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
