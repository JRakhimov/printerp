import React, { useState, useEffect } from 'react';
import { useClients, useCreateClient } from '../hooks/useClients';
import { useProjects } from '../hooks/useProjects';
import { useCreateOrder } from '../hooks/useOrders';
import { getClientDisplayName, ClientSource } from '@printerp/shared';
import { ClientSelect } from './ClientSelect';
import { CityInput } from './CityInput';
import { X, ShoppingBag, Plus, Trash2, Loader2, Calculator, Calendar, DollarSign, CreditCard, UserPlus } from 'lucide-react';

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateOrderModal: React.FC<CreateOrderModalProps> = ({ isOpen, onClose }) => {
  const { data: clients } = useClients();
  const { data: projects } = useProjects();
  const createOrder = useCreateOrder();
  const createClient = useCreateClient();

  const [clientId, setClientId] = useState<string>('');
  const [deadline, setDeadline] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [items, setItems] = useState<{ projectId: string; quantity: number | '' }[]>([]);
  const [customFinalPrice, setCustomFinalPrice] = useState<string>('');
  const [initialPaymentAmount, setInitialPaymentAmount] = useState<string>('');
  const [isDepositManuallyEdited, setIsDepositManuallyEdited] = useState<boolean>(false);
  const [initialPaymentComment, setInitialPaymentComment] = useState<string>('Full prepayment paid');

  // Quick Client Creation state (2 fields: Instagram & City)
  const [isQuickCreatingClient, setIsQuickCreatingClient] = useState(false);
  const [quickInstagram, setQuickInstagram] = useState('');
  const [quickCity, setQuickCity] = useState('Ташкент');

  const projectMap = new Map((projects || []).map((p) => [p.id, p]));

  // Live financial metrics
  let calculatedCost = 0;
  let calculatedPrice = 0;

  for (const item of items) {
    const proj = projectMap.get(item.projectId);
    if (proj) {
      const qty = Number(item.quantity) || 1;
      calculatedCost += proj.defaultCost * qty;
      calculatedPrice += proj.defaultPrice * qty;
    }
  }

  const finalPrice = customFinalPrice !== '' ? Number(customFinalPrice) || 0 : calculatedPrice;
  const estimatedProfit = finalPrice - calculatedCost;
  const marginPercentage = finalPrice > 0 ? Math.round((estimatedProfit / finalPrice) * 100) : 0;

  // Auto-fill 100% price into deposit unless manually altered
  useEffect(() => {
    if (!isDepositManuallyEdited) {
      if (finalPrice > 0) {
        setInitialPaymentAmount(finalPrice.toString());
      } else {
        setInitialPaymentAmount('');
      }
    }
  }, [finalPrice, isDepositManuallyEdited]);

  if (!isOpen) return null;

  const handleCreateQuickClient = async () => {
    if (!quickInstagram.trim()) {
      alert('Пожалуйста, укажите Instagram username');
      return;
    }

    try {
      const newClient = await createClient.mutateAsync({
        instagramUsername: quickInstagram.trim(),
        city: quickCity.trim() || null,
        source: ClientSource.INSTAGRAM,
      });

      setClientId(newClient.id);
      setIsQuickCreatingClient(false);
      setQuickInstagram('');
      setQuickCity('Ташкент');
    } catch (err: any) {
      console.error('Failed to create quick client:', err);
      alert(err?.response?.data?.message || 'Ошибка при создании клиента');
    }
  };

  const addItemRow = () => {
    if (projects && projects.length > 0) {
      setItems([...items, { projectId: projects[0].id, quantity: 1 }]);
    }
  };

  const removeItemRow = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItemRow = (index: number, field: 'projectId' | 'quantity', value: string | number) => {
    const updated = [...items];
    if (field === 'projectId') updated[index].projectId = value as string;
    if (field === 'quantity') {
      updated[index].quantity = value === '' ? '' : isNaN(Number(value)) ? '' : Number(value);
    }
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      alert('Пожалуйста, выберите клиента');
      return;
    }
    if (items.length === 0) {
      alert('Пожалуйста, добавьте хотя бы одну модель в заказ');
      return;
    }

    try {
      const depositToSubmit = initialPaymentAmount !== ''
        ? Number(initialPaymentAmount)
        : (!isDepositManuallyEdited && finalPrice > 0 ? finalPrice : undefined);

      await createOrder.mutateAsync({
        clientId,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        comment: comment || null,
        items: items.map((i) => ({
          projectId: i.projectId,
          quantity: Math.max(1, Number(i.quantity) || 1),
        })),
        finalPrice: customFinalPrice !== '' ? Number(customFinalPrice) : undefined,
        initialPaymentAmount: depositToSubmit,
        initialPaymentComment: initialPaymentComment || undefined,
      });

      // Reset form
      setClientId('');
      setDeadline('');
      setComment('');
      setItems([]);
      setCustomFinalPrice('');
      setInitialPaymentAmount('');
      setIsDepositManuallyEdited(false);
      setIsQuickCreatingClient(false);
      setQuickInstagram('');
      setQuickCity('Ташкент');
      onClose();
    } catch (err) {
      console.error('Failed to create order:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-start justify-center p-4 pt-[max(1.5rem,var(--tg-content-safe-area-inset-top,0px),calc(env(safe-area-inset-top,0px)+3.5rem))] pb-20 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-5 shadow-2xl space-y-4 mb-8">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
            Создание нового заказа
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Client Selection / Quick Client Creation */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-300">Клиент *</label>
              <button
                type="button"
                onClick={() => setIsQuickCreatingClient(!isQuickCreatingClient)}
                className="text-[11px] text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 transition"
              >
                {isQuickCreatingClient ? (
                  <span>← Выбрать существующего</span>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Новый клиент</span>
                  </>
                )}
              </button>
            </div>

            {isQuickCreatingClient ? (
              <div className="bg-slate-950/70 border border-blue-500/30 rounded-xl p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-blue-400 flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5 text-blue-400" />
                    Быстрое создание клиента
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Instagram *
                    </label>
                    <input
                      type="text"
                      value={quickInstagram}
                      onChange={(e) => setQuickInstagram(e.target.value)}
                      placeholder="@username"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Город / Область
                    </label>
                    <CityInput
                      id="quick-client-city"
                      value={quickCity}
                      onChange={setQuickCity}
                      placeholder="напр. Ташкент"
                      className="py-1.5"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsQuickCreatingClient(false)}
                    className="px-2.5 py-1 rounded-lg text-xs text-slate-400 hover:bg-slate-800 transition"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateQuickClient}
                    disabled={createClient.isPending || !quickInstagram.trim()}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                  >
                    {createClient.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                    <span>Сохранить и выбрать</span>
                  </button>
                </div>
              </div>
            ) : (
              <ClientSelect
                value={clientId}
                onChange={setClientId}
                placeholder="Поиск по @instagram, имени, городу или телефону..."
                required
              />
            )}
          </div>

          {/* Items Section */}
          <div className="border border-slate-800 rounded-xl p-3 bg-slate-950/50 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                Состав заказа (Модели)
              </label>
              <button
                type="button"
                onClick={addItemRow}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Выбрать модели
              </button>
            </div>

            {items.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic">Модели в заказ пока не добавлены.</p>
            ) : (
              <div className="space-y-2">
                {items.map((row, idx) => {
                  const proj = projectMap.get(row.projectId);
                  return (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={row.projectId}
                        onChange={(e) => updateItemRow(idx, 'projectId', e.target.value)}
                        className="flex-1 min-w-0 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white truncate focus:border-emerald-500 focus:outline-none"
                      >
                        {(projects || []).map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({Number(p.defaultPrice).toLocaleString('ru-RU')} сум)
                          </option>
                        ))}
                      </select>

                      <div className="w-28 shrink-0 flex items-center bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 focus-within:border-emerald-500">
                        <span className="text-[11px] text-slate-400 mr-1 shrink-0">Кол-во:</span>
                        <input
                          type="number"
                          min="1"
                          value={row.quantity}
                          onChange={(e) => updateItemRow(idx, 'quantity', e.target.value)}
                          className="w-full min-w-0 bg-transparent text-xs text-white text-center font-bold focus:outline-none"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        className="text-slate-500 hover:text-red-400 p-1 shrink-0"
                        title="Удалить модель"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Financial Breakdown & Margin Box */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400 text-[11px]">Себестоимость:</span>
                <p className="font-semibold text-slate-200">{calculatedCost.toLocaleString('ru-RU')} сум</p>
              </div>
              <div>
                <span className="text-slate-400 text-[11px]">По каталогу:</span>
                <p className="font-semibold text-slate-200">{calculatedPrice.toLocaleString('ru-RU')} сум</p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Итоговая цена заказа (сум)
                </label>
                <input
                  type="number"
                  placeholder={calculatedPrice.toString()}
                  value={customFinalPrice}
                  onChange={(e) => setCustomFinalPrice(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-emerald-400 font-bold placeholder-slate-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Расчётная прибыль и маржа</label>
                <div className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs flex items-center justify-between">
                  <span className="font-bold text-emerald-400">{estimatedProfit.toLocaleString('ru-RU')} сум</span>
                  <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded">
                    {marginPercentage}% маржа
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Deadline & Deposit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                Дедлайн сдачи
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="calendar-width bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                  Депозит (Предоплата)
                </label>
                {finalPrice > 0 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsDepositManuallyEdited(false);
                        setInitialPaymentAmount(finalPrice.toString());
                      }}
                      className={`text-[10px] px-1.5 py-0.5 rounded border transition ${
                        !isDepositManuallyEdited || Number(initialPaymentAmount) === finalPrice
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-emerald-300'
                      }`}
                    >
                      100%
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDepositManuallyEdited(true);
                        setInitialPaymentAmount(Math.round(finalPrice / 2).toString());
                      }}
                      className="text-[10px] text-amber-400 hover:text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20"
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDepositManuallyEdited(true);
                        setInitialPaymentAmount('0');
                      }}
                      className="text-[10px] text-slate-400 hover:text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700"
                    >
                      0
                    </button>
                  </div>
                )}
              </div>
              <div className="relative">
                <input
                  type="number"
                  placeholder={finalPrice > 0 ? finalPrice.toString() : '0'}
                  value={initialPaymentAmount}
                  onChange={(e) => {
                    setIsDepositManuallyEdited(true);
                    setInitialPaymentAmount(e.target.value);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-emerald-400 font-bold placeholder-slate-500 focus:border-emerald-500 focus:outline-none pr-12"
                />
                <span className="absolute right-3 top-2 text-[10px] text-slate-500 font-semibold">сум</span>
              </div>
              {finalPrice > 0 && (
                <div className="mt-1 text-[10px] flex items-center justify-between">
                  {Number(initialPaymentAmount || 0) >= finalPrice ? (
                    <span className="text-emerald-400 font-semibold">✓ 100% Предоплата</span>
                  ) : Number(initialPaymentAmount || 0) > 0 ? (
                    <span className="text-amber-400">
                      Остаток: {(finalPrice - Number(initialPaymentAmount)).toLocaleString('ru-RU')} сум
                    </span>
                  ) : (
                    <span className="text-rose-400 font-medium">Без предоплаты</span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Комментарий / Пожелания к заказу</label>
            <textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Процент заполнения, цвет, требования к печати..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
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
              disabled={createOrder.isPending}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition shadow-md shadow-emerald-500/20"
            >
              {createOrder.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Создать заказ</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
