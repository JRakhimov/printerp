import React, { useState } from 'react';
import { useClients, useDeleteClient } from '../hooks/useClients';
import { useFilaments, useDeleteFilament } from '../hooks/useFilaments';
import { CreateClientModal } from '../components/CreateClientModal';
import { CreateFilamentModal } from '../components/CreateFilamentModal';
import { EditFilamentModal } from '../components/EditFilamentModal';
import { ClientDetailModal } from '../components/ClientDetailModal';
import { OrderDetailModal } from '../components/OrderDetailModal';
import { FinancePage } from './FinancePage';
import { SettingsPage } from './SettingsPage';
import { Filament } from '../hooks/useFilaments';
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
} from 'lucide-react';

type SubView = 'menu' | 'clients' | 'filaments' | 'finance' | 'settings';

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
    if (confirm(`Are you sure you want to delete client "${name}"?`)) {
      await deleteClient.mutateAsync(id);
    }
  };

  const handleDeleteFilament = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete filament "${name}"?`)) {
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
            <span>Back to Menu</span>
          </button>
          <button
            onClick={() => setIsClientModalOpen(true)}
            className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition shadow-md shadow-blue-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Client</span>
          </button>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            Clients Directory
          </h2>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients by name, phone, or handle..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {clientsQuery.isLoading && (
          <div className="py-12 flex justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        )}

        <div className="space-y-2.5">
          {clientsQuery.data?.map((client) => (
            <div
              key={client.id}
              onClick={() => setSelectedClientId(client.id)}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between hover:border-blue-500/50 transition cursor-pointer"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-white">{client.name}</h3>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {client.source}
                  </span>
                  {client._count?.orders !== undefined && (
                    <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                      {client._count.orders} orders
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-3 text-xs text-slate-400">
                  {client.telegramUsername && (
                    <span className="flex items-center gap-1">
                      <Send className="w-3 h-3 text-sky-400" />
                      @{client.telegramUsername}
                    </span>
                  )}
                  {client.instagramUsername && (
                    <span className="flex items-center gap-1">
                      <Instagram className="w-3 h-3 text-pink-400" />
                      @{client.instagramUsername}
                    </span>
                  )}
                  {client.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {client.phone}
                    </span>
                  )}
                  {client.city && (
                    <span className="flex items-center gap-1 text-amber-400 font-medium">
                      <MapPin className="w-3 h-3 text-amber-400" />
                      {client.city}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={(e) => handleDeleteClient(e, client.id, client.name)}
                className="text-slate-500 hover:text-red-400 p-1.5"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
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
            <span>Back to Menu</span>
          </button>
          <button
            onClick={() => setIsFilamentModalOpen(true)}
            className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition shadow-md shadow-indigo-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Filament</span>
          </button>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Palette className="w-5 h-5 text-indigo-400" />
            Filament Inventory
          </h2>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search filaments by brand or name..."
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
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 hover:border-indigo-500/50 transition cursor-pointer group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2.5">
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm shrink-0"
                    style={{ backgroundColor: fil.color || '#3b82f6' }}
                  />
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5 group-hover:text-indigo-400 transition">
                      {fil.brand} {fil.name}
                      <Pencil className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition" />
                    </h3>
                    <p className="text-xs text-slate-400">{fil.material} • {fil.spoolWeightG}g spool</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="text-right">
                    <span className="text-xs font-bold text-white block">{Number(fil.pricePerSpool).toLocaleString('ru-RU')} сум</span>
                    <span className="text-[10px] text-emerald-400">{Number(fil.costPerGram).toLocaleString('ru-RU')} сум/г</span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteFilament(e, fil.id, `${fil.brand} ${fil.name}`)}
                    className="text-slate-500 hover:text-red-400 p-1 ml-1"
                    title="Delete Filament"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {fil.stockG !== null && (
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>Stock remaining:</span>
                  <span className="font-semibold text-slate-200">{fil.stockG} g</span>
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
          <span>Back to Menu</span>
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
          <span>Back to Menu</span>
        </button>
        <SettingsPage />
      </div>
    );
  }

  // Main menu list
  const menuSections = [
    { id: 'clients', title: 'Clients Directory', icon: Users, description: 'Manage clients and contact info', color: 'text-blue-400' },
    { id: 'filaments', title: 'Filament Stock', icon: Palette, description: 'Spools, brands, materials & cost per gram', color: 'text-indigo-400' },
    { id: 'finance', title: 'Finance & Expenses', icon: DollarSign, description: 'Cash flow, payments & expenses', color: 'text-emerald-400' },
    { id: 'settings', title: 'System Settings', icon: Settings, description: 'Users, allowlist & system configs', color: 'text-amber-400' },
  ];

  return (
    <div className="space-y-3 pb-20">
      <h2 className="text-base font-bold text-white mb-2">Modules & Settings</h2>
      <div className="space-y-2">
        {menuSections.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              onClick={() => {
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
