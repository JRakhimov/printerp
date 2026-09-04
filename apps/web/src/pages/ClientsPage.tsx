import React, { useState } from 'react';
import { useClients, useDeleteClient } from '../hooks/useClients';
import { CreateClientModal } from '../components/CreateClientModal';
import { ClientDetailModal } from '../components/ClientDetailModal';
import { OrderDetailModal } from '../components/OrderDetailModal';
import { getClientDisplayName } from '@printerp/shared';
import {
  Users,
  Plus,
  Search,
  Trash2,
  Loader2,
  ChevronLeft,
  Instagram,
  MapPin,
  Pencil,
  ShoppingBag,
} from 'lucide-react';

export interface ClientsPageProps {
  onBack?: () => void;
}

export const ClientsPage: React.FC<ClientsPageProps> = ({ onBack }) => {
  const [search, setSearch] = useState('');
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const clientsQuery = useClients(search);
  const deleteClient = useDeleteClient();

  const handleDeleteClient = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (confirm(`Вы уверены, что хотите удалить клиента "${name}"?`)) {
      await deleteClient.mutateAsync(id);
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
            <span>Назад в меню</span>
          </button>
        ) : (
          <div />
        )}
        <button
          onClick={() => setIsClientModalOpen(true)}
          className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition shadow-md shadow-blue-500/20"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Добавить клиента</span>
        </button>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-400" />
          База клиентов
        </h2>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск клиентов по имени, телефону или Instagram..."
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {clientsQuery.isLoading && (
        <div className="py-12 flex justify-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      )}

      <div className="space-y-2.5">
        {clientsQuery.data?.map((client) => {
          const orderCount = client._count?.orders ?? client.orders?.length ?? 0;
          const totalSpent = (client.orders || []).reduce(
            (sum, o) => sum + (o.finalPrice && o.finalPrice > 0 ? o.finalPrice : (o.calculatedPrice || 0)),
            0
          );
          const instagramHandle = client.instagramUsername
            ? (client.instagramUsername.startsWith('@') ? client.instagramUsername : `@${client.instagramUsername}`)
            : client.name || (client.telegramUsername ? `@${client.telegramUsername}` : 'Клиент');

          return (
            <div
              key={client.id}
              onClick={() => setSelectedClientId(client.id)}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-sm cursor-pointer transition"
            >
              <div className="flex items-center justify-between gap-3">
                {/* Top Row: Instagram Handle & Yellow City Badge */}
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <div className="flex items-center gap-1.5 text-sm font-bold text-white">
                    <Instagram className="w-4 h-4 text-pink-400 shrink-0" />
                    <span>{instagramHandle}</span>
                  </div>

                  {client.city && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg">
                      <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{client.city}</span>
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-1.5 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedClientId(client.id);
                    }}
                    className="text-slate-400 hover:text-blue-400 p-1"
                    title="Редактировать клиента"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteClient(e, client.id, getClientDisplayName(client))}
                    className="text-slate-500 hover:text-red-400 p-1"
                    title="Удалить клиента"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Bottom Row: Order count & Total spent */}
              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="text-slate-300">
                    <strong className="text-white font-bold">{orderCount}</strong> {orderCount === 1 ? 'заказ' : (orderCount >= 2 && orderCount <= 4 ? 'заказа' : 'заказов')} на сумму{' '}
                    <strong className="text-emerald-400 font-bold">{totalSpent.toLocaleString('ru-RU')} сум</strong>
                  </span>
                </div>

                {client.phone && (
                  <span className="text-[11px] text-slate-500 hidden sm:inline-block">
                    {client.phone}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <CreateClientModal isOpen={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} />
      <ClientDetailModal
        clientId={selectedClientId}
        onClose={() => setSelectedClientId(null)}
        onSelectOrder={(orderId) => setSelectedOrderId(orderId)}
      />
      <OrderDetailModal orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />
    </div>
  );
};
