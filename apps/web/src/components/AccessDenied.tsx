import React from 'react';
import { Lock, RefreshCw } from 'lucide-react';

interface AccessDeniedProps {
  message: string | null;
  onRetry: () => void;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({ message, onRetry }) => {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-sm w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center shadow-xl">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Доступ ограничен</h2>
        <p className="text-sm text-slate-400 mb-6">
          {message || 'Ваш Telegram-аккаунт не авторизован для работы с системой PrintERP.'}
        </p>
        <div className="space-y-3">
          <button
            onClick={onRetry}
            className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 px-4 rounded-xl transition"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Повторить попытку</span>
          </button>
          <p className="text-xs text-slate-500">
            Свяжитесь с владельцем для добавления в список разрешённых пользователей.
          </p>
        </div>
      </div>
    </div>
  );
};
