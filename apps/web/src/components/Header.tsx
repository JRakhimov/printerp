import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Printer, Shield, User, Sun, Moon } from 'lucide-react';

export const Header: React.FC = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-2.5 flex items-center justify-between shadow-md">
      <div className="flex items-center space-x-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md shadow-blue-500/20">
          <Printer className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-white">
            PrintERP
          </h1>
          <p className="text-[11px] text-slate-400">Система управления заказами</p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:text-white transition flex items-center justify-center"
          title={theme === 'dark' ? 'Переключить на светлую тему' : 'Переключить на темную тему'}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-400" />
          )}
        </button>

        {user && (
          <div className="flex items-center space-x-2 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700/60">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-medium text-slate-200">
              {user.firstName || user.telegramUsername || 'Пользователь'}
            </span>
            {user.role === 'OWNER' && (
              <span title="Владелец">
                <Shield className="w-3 h-3 text-amber-400" />
              </span>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
