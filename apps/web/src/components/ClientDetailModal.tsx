import React, { useState, useEffect } from 'react';
import { useClient, useUpdateClient } from '../hooks/useClients';
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
} from 'lucide-react';

import { ClientSource } from '@printerp/shared';

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
  const { data: client, isLoading } = useClient(clientId);
  const updateClient = useUpdateClient();

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
    if (!name.trim()) {
      alert('Client name cannot be empty');
      return;
    }
    try {
      await updateClient.mutateAsync({
        id: client.id,
        dto: {
          name: name.trim(),
          telegramUsername: telegramUsername.trim() || null,
          instagramUsername: instagramUsername.trim() || null,
          phone: phone.trim() || null,
          city: city.trim() || null,
          source,
          notes: notes.trim() || null,
        },
      });
      alert('Client details updated successfully!');
    } catch (err: any) {
      console.error('Failed to update client details:', err);
      alert(err.response?.data?.message || 'Failed to update client details');
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
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-5 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
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
                    {client.name}
                    <span className="text-[10px] font-semibold bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md uppercase">
                      {client.source}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Customer since {new Date(client.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Contacts Links Bar */}
            <div className="flex flex-wrap gap-2 text-xs">
              {client.telegramUsername && (
                <a
                  href={`https://t.me/${client.telegramUsername}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-3 py-1.5 rounded-xl border border-blue-500/20 transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>@{client.telegramUsername}</span>
                </a>
              )}
              {client.instagramUsername && (
                <a
                  href={`https://instagram.com/${client.instagramUsername}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-1.5 bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 px-3 py-1.5 rounded-xl border border-pink-500/20 transition"
                >
                  <Instagram className="w-3.5 h-3.5" />
                  <span>@{client.instagramUsername}</span>
                </a>
              )}
              {client.phone && (
                <a
                  href={`tel:${client.phone}`}
                  className="inline-flex items-center space-x-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-xl border border-emerald-500/20 transition"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{client.phone}</span>
                </a>
              )}
              {client.city && (
                <span className="inline-flex items-center space-x-1.5 bg-amber-500/10 text-amber-400 px-3 py-1.5 rounded-xl border border-amber-500/20">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{client.city}</span>
                </span>
              )}
            </div>

            {/* Financial Activity Summary */}
            <div className="grid grid-cols-3 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">Total Orders</span>
                <span className="font-bold text-white flex items-center gap-1 mt-0.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-indigo-400" />
                  {totalOrders}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Lifetime Revenue</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                  {totalSpent.toLocaleString('ru-RU')} сум
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Unpaid Balance</span>
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
                Edit Client Information
              </h4>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Snow"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">City / Город</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Tashkent"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

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
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Instagram</label>
                  <input
                    type="text"
                    value={instagramUsername}
                    onChange={(e) => setInstagramUsername(e.target.value)}
                    placeholder="@insta_handle"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+998 90 123-45-67"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Client Source</label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value as ClientSource)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value={ClientSource.INSTAGRAM}>Instagram</option>
                    <option value={ClientSource.TELEGRAM}>Telegram</option>
                    <option value={ClientSource.FRIEND}>Friend / Referral</option>
                    <option value={ClientSource.REPEAT_CLIENT}>Repeat Client</option>
                    <option value={ClientSource.OTHER}>Other</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                  <MessageSquare className="w-3 h-3 text-indigo-400" />
                  Notes & Preferences
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Preferred delivery location, discount rules..."
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
                  <span>Save Client Info</span>
                </button>
              </div>
            </div>

            {/* Order History Timeline */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-indigo-400" />
                Order History ({orders.length})
              </h4>

              {orders.length === 0 ? (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-center text-slate-500 text-xs">
                  No orders placed yet.
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
                              Order #{ord.orderNumber}
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
                              Deadline:{' '}
                              <strong className="text-slate-300">
                                {new Date(ord.deadline).toLocaleDateString()}
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
