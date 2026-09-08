import React, { useState } from 'react';
import { ClientsPage } from './ClientsPage';
import { FilamentsPage } from './FilamentsPage';
import { FinancePage } from './FinancePage';
import { SettingsPage } from './SettingsPage';
import { PrintersPage } from './PrintersPage';
import {
  Users,
  Palette,
  Printer,
  DollarSign,
  Settings,
  ChevronLeft,
  LogOut,
} from 'lucide-react';

type SubView = 'menu' | 'clients' | 'filaments' | 'finance' | 'settings' | 'printers';

interface MorePageProps {
  resetSignal?: number;
}

export const MorePage: React.FC<MorePageProps> = ({ resetSignal }) => {
  const [activeView, setActiveView] = useState<SubView>('menu');

  React.useEffect(() => {
    if (resetSignal !== undefined && resetSignal > 0) {
      setActiveView('menu');
    }
  }, [resetSignal]);

  if (activeView === 'clients') {
    return <ClientsPage onBack={() => setActiveView('menu')} />;
  }

  if (activeView === 'filaments') {
    return <FilamentsPage onBack={() => setActiveView('menu')} />;
  }

  if (activeView === 'finance') {
    return (
      <div className="space-y-4 pb-20">
        <button
          onClick={() => setActiveView('menu')}
          className="flex items-center space-x-1 text-xs text-slate-400 hover:text-white"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Назад</span>
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
          <span>Назад</span>
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
          <span>Назад</span>
        </button>
        <PrintersPage />
      </div>
    );
  }

  const handleCloseApp = () => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg && typeof tg.close === 'function') {
      tg.close();
    } else {
      try {
        window.close();
      } catch (e) {
        console.warn('Window close not allowed by browser context');
      }
    }
  };

  // Main menu list
  const menuSections = [
    { id: 'clients', title: 'База клиентов', icon: Users, description: 'Контакты, соцсети и история заказов', color: 'text-blue-500', bg: 'bg-blue-500/10 border border-blue-500/20' },
    { id: 'filaments', title: 'Склад филамента', icon: Palette, description: 'Катушки, бренды, материалы и остатки', color: 'text-indigo-500', bg: 'bg-indigo-500/10 border border-indigo-500/20' },
    { id: 'finance', title: 'Финансы и расходы', icon: DollarSign, description: 'Денежные потоки, платежи и статьи затрат', color: 'text-emerald-500', bg: 'bg-emerald-500/10 border border-emerald-500/20' },
    { id: 'printers', title: '3D-Принтеры', icon: Printer, description: 'Bambu Lab MQTT телеметрия и статусы', color: 'text-sky-500', bg: 'bg-sky-500/10 border border-sky-500/20' },
    { id: 'settings', title: 'Настройки системы', icon: Settings, description: 'Пользователи, Telegram-доступ и параметры', color: 'text-amber-500', bg: 'bg-amber-500/10 border border-amber-500/20' },
    { id: 'close_app', title: 'Закрыть приложение', icon: LogOut, description: 'Завершить работу и закрыть мини-апп', color: 'text-rose-500', bg: 'bg-rose-500/10 border border-rose-500/20' },
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
                if (item.id === 'close_app') handleCloseApp();
              }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between transition cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.bg}`}>
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
