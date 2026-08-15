import React, { useState, useEffect } from 'react';
import { useClient, useUpdateClient, useDeleteClient } from '../hooks/useClients';
import { getClientDisplayName, ClientSource } from '@printerp/shared';
import { CityInput } from './CityInput';
import {
  X,
  User,
  Phone,
  Send,
  Instagram,
  ShoppingBag,
  DollarSign,
  Calendar,
  Save,
  Loader2,
  MessageSquare,
  ChevronRight,
  CreditCard,
  MapPin,
  Trash2,
} from 'lucide-react';

interface ClientDetailModalProps {
  clientId: string | null;
  onClose: () => void;
  onSelectOrder?: (orderId: string) => void;
}

const statusColors: Record<string, string> = {
  CREATED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  DESIGN: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  PRINTING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  PRINTED: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  COMPLETED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  CANCELLED: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

const paymentStatusColors: Record<string, string> = {
  UNPAID: 'bg-red-500/10 text-red-400 border-red-500/20',
  PARTIALLY_PAID: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  PAID: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

export const ClientDetailModal: React.FC<ClientDetailModalProps> = ({
  clientId,
  onClose,
  onSelectOrder,
}) => {
  const { data: client, isLoading } = useClient(clientId || '');
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();

  const [name, setName] = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');
  const [instagramUsername, setInstagramUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [source, setSource] = useState<ClientSource>(ClientSource.INSTAGRAM);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (client) {
      setName(client.name || '');
      setTelegramUsername(client.telegramUsername || '');
      setInstagramUsername(client.instagramUsername || '');
      setPhone(client.phone || '');
      setCity(client.city || '');
      setSource(client.source || ClientSource.INSTAGRAM);
      setNotes(client.notes || '');
    }
  }, [client]);

  if (!clientId) return null;

  const handleSaveDetails = async () => {
    if (!client) return;
    try {
      await updateClient.mutateAsync({
        id: client.id,
        dto: {
          name: name.trim() || null,
          telegramUsername: telegramUsername.trim() || null,
          instagramUsername: instagramUsername.trim() || null,
          phone: phone.trim() || null,
          city: city.trim() || null,
          source,
          notes: notes.trim() || null,
        },
      });
      alert('Данные клиента успешно сохранены!');
    } catch (err: any) {
      console.error('Failed to update client details:', err);
      alert(err.response?.data?.message || 'Ошибка обновления данных клиента');
    }
  };

  // Financial calculations for client lifetime history
  const orders = client?.orders || [];
  const totalOrders = orders.length;

  let totalSpent = 0;
  let totalPaid = 0;

  for (const ord of orders) {
    const price = ord.finalPrice ?? ord.calculatedPrice ?? 0;
    totalSpent += price;

    const paidForOrder = (ord.payments || []).reduce((sum, p) => sum + p.amount, 0);
    totalPaid += paidForOrder;
  }

  const unpaidBalance = Math.max(0, totalSpent - totalPaid);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-start justify-center p-4 pt-[max(1.5rem,var(--tg-content-safe-area-inset-top,0px),calc(env(safe-area-inset-top,0px)+3.5rem))] pb-20 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-5 shadow-2xl space-y-4 mb-8 max-h-[90vh] overflow-y-auto">
        {isLoading || !client ? (
          <div className="py-12 flex justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          </div>
        ) : (
          <>
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    {getClientDisplayName(client)}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Клиент с {new Date(client.createdAt).toLocaleDateString('ru-RU')}
                  </p>
                </div>
              </div>

              <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Client Info Grid (Instagram | City, Full Name | Phone, Telegram | Source) */}
            <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
              {/* Row 1: Instagram | City */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center space-x-1.5 overflow-hidden">
                  <Instagram className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                  {client.instagramUsername ? (
                    <a
                      href={`https://instagram.com/${client.instagramUsername.replace(/^@/, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-pink-400 hover:underline truncate font-semibold"
                    >
                      @{client.instagramUsername.replace(/^@/, '')}
                    </a>
                  ) : (
                    <span className="text-slate-500 italic">Instagram не указан</span>
                  )}
                </div>
                <div className="flex items-center space-x-1.5 overflow-hidden">
                  <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-slate-200 truncate">{client.city || 'Город не указан'}</span>
                </div>
              </div>

              {/* Row 2: Full Name | Phone */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-900">
                <div className="flex items-center space-x-1.5 overflow-hidden">
                  <User className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="text-slate-200 truncate">{client.name || 'Клиент без имени'}</span>
                </div>
                <div className="flex items-center space-x-1.5 overflow-hidden">
                  <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  {client.phone ? (
                    <a href={`tel:${client.phone}`} className="text-emerald-400 hover:underline truncate font-medium">
                      {client.phone}
                    </a>
                  ) : (
                    <span className="text-slate-500 italic">Телефон не указан</span>
                  )}
                </div>
              </div>

              {/* Row 3: Telegram | Source */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-900">
                <div className="flex items-center space-x-1.5 overflow-hidden">
                  <Send className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  {client.telegramUsername ? (
                    <a
                      href={`https://t.me/${client.telegramUsername.replace(/^@/, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sky-400 hover:underline truncate font-semibold"
                    >
                      @{client.telegramUsername.replace(/^@/, '')}
                    </a>
                  ) : (
                    <span className="text-slate-500 italic">Telegram не указан</span>
                  )}
                </div>
                <div className="flex items-center space-x-1.5 overflow-hidden">
                    <span className="text-[10px] font-semibold text-slate-400">Источник:</span>
                    <span className="text-slate-400">{client.source}</span>
                </div>
              </div>
            </div>

            {/* Financial Activity Summary */}
            <div className="grid grid-cols-3 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">Всего заказов</span>
                <span className="font-bold text-white flex items-center gap-1 mt-0.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-indigo-400" />
                  {totalOrders}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Выручка за всё время</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                  {totalSpent.toLocaleString('ru-RU')} сум
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Неоплаченный долг</span>
                <span
                  className={`font-bold flex items-center gap-1 mt-0.5 ${
                    unpaidBalance > 0 ? 'text-amber-400' : 'text-slate-400'
                  }`}
                >
                  {unpaidBalance.toLocaleString('ru-RU')} сум
                </span>
              </div>
            </div>

            {/* Editable Profile Fields */}
            <div className="space-y-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-400" />
                Редактирование профиля клиента
              </h4>

              {/* Row 1: Instagram | City */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Instagram</label>
                  <input
                    type="text"
                    value={instagramUsername}
                    onChange={(e) => setInstagramUsername(e.target.value)}
                    placeholder="@insta_handle"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Город / Область</label>
                  <CityInput
                    id="edit-client-city"
                    value={city}
                    onChange={setCity}
                    placeholder="напр. Ташкент"
                    className="py-1.5"
                  />
                </div>
              </div>

              {/* Row 2: Full Name | Phone */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Имя / ФИО</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="напр. Александр (необязательно)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Телефон</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+998 90 123-45-67"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 3: Telegram | Source */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Telegram</label>
                  <input
                    type="text"
                    value={telegramUsername}
                    onChange={(e) => setTelegramUsername(e.target.value)}
                    placeholder="@username"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Источник клиента</label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value as ClientSource)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value={ClientSource.INSTAGRAM}>Instagram</option>
                    <option value={ClientSource.TELEGRAM}>Telegram</option>
                    <option value={ClientSource.FRIEND}>Рекомендация / Друзья</option>
                    <option value={ClientSource.REPEAT_CLIENT}>Постоянный клиент</option>
                    <option value={ClientSource.OTHER}>Другое</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                  <MessageSquare className="w-3 h-3 text-indigo-400" />
                  Заметки и пожелания
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Предпочтительное место доставки, скидки..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleSaveDetails}
                  disabled={updateClient.isPending}
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 transition shadow-md shadow-blue-500/20"
                >
                  {updateClient.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>Сохранить данные</span>
                </button>
              </div>
            </div>

            {/* Order History Timeline */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-indigo-400" />
                История заказов ({orders.length})
              </h4>

              {orders.length === 0 ? (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-center text-slate-500 text-xs">
                  Заказов пока нет.
                </div>
              ) : (
                <div className="space-y-2">
                  {orders.map((ord) => {
                    const price = ord.finalPrice ?? ord.calculatedPrice ?? 0;
                    return (
                      <div
                        key={ord.id}
                        onClick={() => onSelectOrder && onSelectOrder(ord.id)}
                        className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2 hover:border-indigo-500/50 transition cursor-pointer group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-indigo-400">
                              Заказ #100{ord.orderNumber}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                statusColors[ord.status] || 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {ord.status}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                paymentStatusColors[ord.paymentStatus] || 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {ord.paymentStatus}
                            </span>
                          </div>

                          <div className="flex items-center space-x-1 text-slate-400 group-hover:text-indigo-400 transition">
                            <span className="text-xs font-bold text-white">
                              {price.toLocaleString('ru-RU')} сум
                            </span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </div>
                        </div>

                        {/* Order Items Snapshot List */}
                        {ord.items && ord.items.length > 0 && (
                          <div className="text-[11px] text-slate-300 bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-slate-800/80">
                            {ord.items.map((it) => (
                              <span key={it.id} className="mr-3 inline-block">
                                • {it.projectNameSnapshot}{' '}
                                <strong className="text-indigo-300">x{it.quantity}</strong>
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-600" />
                            {new Date(ord.createdAt).toLocaleDateString('ru-RU', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>

                          {ord.deadline && (
                            <span className="text-slate-400">
                              Дедлайн:{' '}
                              <strong className="text-slate-300">
                                {new Date(ord.deadline).toLocaleDateString('ru-RU')}
                              </strong>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
