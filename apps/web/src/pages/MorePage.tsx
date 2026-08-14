import React, { useState } from 'react';
import { useClients, useDeleteClient } from '../hooks/useClients';
import { useFilaments, useDeleteFilament, Filament } from '../hooks/useFilaments';
import { CreateClientModal } from '../components/CreateClientModal';
import { CreateFilamentModal } from '../components/CreateFilamentModal';
import { EditFilamentModal } from '../components/EditFilamentModal';
import { ClientDetailModal } from '../components/ClientDetailModal';
import { OrderDetailModal } from '../components/OrderDetailModal';
import { FinancePage } from './FinancePage';
import { SettingsPage } from './SettingsPage';
import { PrintersPage } from './PrintersPage';
import { getClientDisplayName } from '@printerp/shared';
import {
  Users,
  Palette,
  Printer,
  DollarSign,
  Settings,
  Plus,
  Search,
  Trash2,
  Loader2,
  ChevronLeft,
  Phone,
  Send,
  Instagram,
  MapPin,
  Pencil,
  ShoppingBag,
} from 'lucide-react';

type SubView = 'menu' | 'clients' | 'filaments' | 'finance' | 'settings' | 'printers';

interface MorePageProps {
  resetSignal?: number;
}

export const MorePage: React.FC<MorePageProps> = ({ resetSignal }) => {
  const [activeView, setActiveView] = useState<SubView>('menu');
  const [search, setSearch] = useState('');
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isFilamentModalOpen, setIsFilamentModalOpen] = useState(false);
  const [selectedFilament, setSelectedFilament] = useState<Filament | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  React.useEffect(() => {
    if (resetSignal !== undefined && resetSignal > 0) {
      setActiveView('menu');
    }
  }, [resetSignal]);

  const clientsQuery = useClients(search);
  const filamentsQuery = useFilaments(search);

  const deleteClient = useDeleteClient();
  const deleteFilament = useDeleteFilament();

  const handleDeleteClient = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (confirm(`Вы уверены, что хотите удалить клиента "${name}"?`)) {
      await deleteClient.mutateAsync(id);
    }
  };

  const handleDeleteFilament = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (confirm(`Вы уверены, что хотите удалить филамент "${name}"?`)) {
      await deleteFilament.mutateAsync(id);
    }
  };

  if (activeView === 'clients') {
    return (
      <div className="space-y-4 pb-20">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setActiveView('menu')}
            className="flex items-center space-x-1 text-xs text-slate-400 hover:text-white"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Назад в меню</span>
          </button>
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
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-sm cursor-pointer hover:border-slate-700 transition"
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
  }

  if (activeView === 'filaments') {
    return (
      <div className="space-y-4 pb-20">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setActiveView('menu')}
            className="flex items-center space-x-1 text-xs text-slate-400 hover:text-white"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Назад в меню</span>
          </button>
          <button
            onClick={() => setIsFilamentModalOpen(true)}
            className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition shadow-md shadow-indigo-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Добавить филамент</span>
          </button>
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
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-sm cursor-pointer hover:border-slate-700 transition"
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

              {fil.stockG !== null && (
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>Остаток на складе:</span>
                  <span className="font-semibold text-slate-200">{fil.stockG} г</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <CreateFilamentModal isOpen={isFilamentModalOpen} onClose={() => setIsFilamentModalOpen(false)} />
        <EditFilamentModal
          filament={selectedFilament}
          isOpen={!!selectedFilament}
          onClose={() => setSelectedFilament(null)}
        />
      </div>
    );
  }

  if (activeView === 'finance') {
    return (
      <div className="space-y-4 pb-20">
        <button
          onClick={() => setActiveView('menu')}
          className="flex items-center space-x-1 text-xs text-slate-400 hover:text-white"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Назад в меню</span>
        </button>
        <FinancePage />
      </div>
    );
  }

  if (activeView === 'settings') {
    return (
      <div className="space-y-4 pb-20">
        <button
          onClick={() => setActiveView('menu')}
          className="flex items-center space-x-1 text-xs text-slate-400 hover:text-white"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Назад в меню</span>
        </button>
        <SettingsPage />
      </div>
    );
  }

  if (activeView === 'printers') {
    return (
      <div className="space-y-4 pb-20">
        <button
          onClick={() => setActiveView('menu')}
          className="flex items-center space-x-1 text-xs text-slate-400 hover:text-white"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Назад в меню</span>
        </button>
        <PrintersPage />
      </div>
    );
  }

  // Main menu list
  const menuSections = [
    { id: 'clients', title: 'База клиентов', icon: Users, description: 'Контакты, соцсети и история заказов', color: 'text-blue-400' },
    { id: 'filaments', title: 'Склад филамента', icon: Palette, description: 'Катушки, бренды, материалы и остатки', color: 'text-indigo-400' },
    { id: 'finance', title: 'Финансы и расходы', icon: DollarSign, description: 'Денежные потоки, платежи и статьи затрат', color: 'text-teal-400' },
    { id: 'printers', title: '3D-Принтеры', icon: Printer, description: 'Bambu Lab MQTT телеметрия и статусы', color: 'text-emerald-400' },
    { id: 'settings', title: 'Настройки системы', icon: Settings, description: 'Пользователи, Telegram-доступ и параметры', color: 'text-amber-400' },
  ];

  return (
    <div className="space-y-3 pb-20">
      <h2 className="text-base font-bold text-white mb-2">Разделы и настройки</h2>
      <div className="space-y-2">
        {menuSections.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              onClick={() => {
                if (item.id === 'printers') setActiveView('printers');
                if (item.id === 'clients') setActiveView('clients');
                if (item.id === 'filaments') setActiveView('filaments');
                if (item.id === 'finance') setActiveView('finance');
                if (item.id === 'settings') setActiveView('settings');
              }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between hover:border-slate-700 transition cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
                  <Icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                  <p className="text-xs text-slate-400">{item.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
