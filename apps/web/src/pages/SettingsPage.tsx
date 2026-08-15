import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  UpdateFinancialSettingsSchema,
  UpdateFinancialSettingsDto,
  Role,
} from '@printerp/shared';
import { useFinancialSettings, useUpdateFinancialSettings } from '../hooks/useSettings';
import { useUsers, useUpdateUser, useDeleteUser, UserItem } from '../hooks/useUsers';
import { useTheme } from '../contexts/ThemeContext';
import { AddUserModal } from '../components/AddUserModal';
import { EditUserModal } from '../components/EditUserModal';
import {
  Settings,
  DollarSign,
  Shield,
  Users,
  UserPlus,
  Percent,
  Zap,
  Clock,
  Save,
  Loader2,
  Trash2,
  CheckCircle2,
  XCircle,
  Send,
  Edit,
  Sun,
  Moon,
  Palette,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [isAddUserModalOpen, setIsAddUserModalOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<UserItem | null>(null);

  const { data: finSettings, isLoading: isFinLoading } = useFinancialSettings();
  const updateFinSettings = useUpdateFinancialSettings();

  const { data: users, isLoading: isUsersLoading } = useUsers();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateFinancialSettingsDto>({
    resolver: zodResolver(UpdateFinancialSettingsSchema),
    defaultValues: {
      defaultMarkupPercentage: 150,
      electricityCostPerKwh: 1000,
      hourlyLaborRate: 25000,
    },
  });

  useEffect(() => {
    if (finSettings) {
      reset(finSettings);
    }
  }, [finSettings, reset]);

  const onSaveFinancial = async (data: UpdateFinancialSettingsDto) => {
    try {
      await updateFinSettings.mutateAsync(data);
      alert('Финансовые настройки успешно сохранены!');
    } catch (err) {
      console.error('Failed to save financial settings:', err);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean, displayName?: string) => {
    if (currentActive) {
      const label = displayName ? ` "${displayName}"` : '';
      if (!window.confirm(`Вы уверены, что хотите деактивировать пользователя${label}?`)) {
        return;
      }
    }
    try {
      await updateUser.mutateAsync({
        id,
        dto: { isActive: !currentActive },
      });
    } catch (err) {
      console.error('Failed to toggle active state:', err);
    }
  };

  const handleChangeRole = async (id: string, newRole: Role) => {
    try {
      await updateUser.mutateAsync({
        id,
        dto: { role: newRole },
      });
    } catch (err) {
      console.error('Failed to change role:', err);
    }
  };

  const handleDeleteUser = async (id: string, telegramId: string) => {
    if (confirm(`Вы уверены, что хотите удалить пользователя (Telegram ID: ${telegramId}) из списка разрешённых?`)) {
      await deleteUser.mutateAsync(id);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-400" />
            Настройки системы
          </h2>
          <p className="text-xs text-slate-400">Правила ценообразования, темы и доступ команды</p>
        </div>
      </div>

      {/* Theme & Interface Appearance Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <h3 className="text-xs font-bold text-white flex items-center gap-2">
            <Palette className="w-4 h-4 text-indigo-400" />
            Тема и оформление интерфейса
          </h3>
          <span className="text-[10px] bg-indigo-500/10 text-indigo-400 font-semibold px-2 py-0.5 rounded-md border border-indigo-500/20">
            {theme === 'dark' ? 'Темная тема' : 'Светлая тема'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`p-3 rounded-xl border flex items-center space-x-3 transition ${
              theme === 'dark'
                ? 'bg-slate-800 border-indigo-500 text-white font-bold ring-1 ring-indigo-500/30'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-amber-400 border border-slate-800 shrink-0">
              <Moon className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-left">
              <span className="text-xs font-bold block">Темная тема</span>
              <span className="text-[10px] text-slate-400 font-normal">Dark Slate Blue</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`p-3 rounded-xl border flex items-center space-x-3 transition ${
              theme === 'light'
                ? 'bg-slate-800 border-amber-500 text-white font-bold ring-1 ring-amber-500/30'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-amber-500 border border-slate-200 shrink-0">
              <Sun className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-left">
              <span className="text-xs font-bold block">Светлая тема</span>
              <span className="text-[10px] text-slate-400 font-normal">Clean Light Gray</span>
            </div>
          </button>
        </div>
      </div>

      {/* Financial Constants & Pricing Rules Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <h3 className="text-xs font-bold text-white flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            Финансовые константы и наценки
          </h3>
          <span className="text-[10px] bg-slate-800 text-slate-300 font-semibold px-2 py-0.5 rounded-md">
            Валюта: UZS (сум)
          </span>
        </div>

        {isFinLoading ? (
          <div className="py-6 flex justify-center text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSaveFinancial)} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Default Markup % */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 text-emerald-400" />
                  Базовая наценка на прибыль (%)
                </label>
                <input
                  {...register('defaultMarkupPercentage', { valueAsNumber: true })}
                  type="number"
                  placeholder="150"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
                {errors.defaultMarkupPercentage && (
                  <p className="text-[10px] text-red-400 mt-0.5">{errors.defaultMarkupPercentage.message}</p>
                )}
              </div>

              {/* Electricity Rate per kWh */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Тариф электроэнергии (сум/кВт·ч)
                </label>
                <input
                  {...register('electricityCostPerKwh', { valueAsNumber: true })}
                  type="number"
                  placeholder="1000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
                {errors.electricityCostPerKwh && (
                  <p className="text-[10px] text-red-400 mt-0.5">{errors.electricityCostPerKwh.message}</p>
                )}
              </div>

              {/* Hourly Labor Rate */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  Стоимость работы / дизайна (сум/час)
                </label>
                <input
                  {...register('hourlyLaborRate', { valueAsNumber: true })}
                  type="number"
                  placeholder="25000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
                {errors.hourlyLaborRate && (
                  <p className="text-[10px] text-red-400 mt-0.5">{errors.hourlyLaborRate.message}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={updateFinSettings.isPending}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition shadow-md shadow-emerald-500/20"
              >
                {updateFinSettings.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>Сохранить финансовые настройки</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Team Access & Allowlist Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              Список доступа команды и роли
            </h3>
            <p className="text-[11px] text-slate-400">Telegram-аккаунты с доступом к системе PrintERP</p>
          </div>
          <button
            onClick={() => setIsAddUserModalOpen(true)}
            className="flex items-center space-x-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition shadow-md shadow-amber-500/20"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Добавить пользователя</span>
          </button>
        </div>

        {isUsersLoading ? (
          <div className="py-8 flex justify-center text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
          </div>
        ) : users?.length === 0 ? (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-center text-slate-500 text-xs">
            Пользователи пока не добавлены.
          </div>
        ) : (
          <div className="space-y-2.5">
            {users?.map((user) => (
              <div
                key={user.id}
                onClick={() => setEditingUser(user)}
                className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs transition cursor-pointer group"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white">
                      {user.firstName || user.telegramUsername || `ID: ${user.telegramId}`}
                    </span>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        user.role === Role.OWNER
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      }`}
                    >
                      {user.role === Role.OWNER ? 'ВЛАДЕЛЕЦ' : 'СОТРУДНИК'}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleActive(
                          user.id,
                          user.isActive,
                          user.firstName || user.telegramUsername || `ID: ${user.telegramId}`,
                        );
                      }}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 transition ${
                        user.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}
                    >
                      {user.isActive ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" /> Активен
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3" /> Отключён
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center space-x-3 text-[11px] text-slate-400">
                    <span className="font-mono">ID: {user.telegramId}</span>
                    {user.telegramUsername && (
                      <a
                        href={`https://t.me/${user.telegramUsername}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 text-sky-400 hover:text-sky-300"
                      >
                        <Send className="w-3 h-3" />
                        @{user.telegramUsername}
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingUser(user);
                    }}
                    className="text-slate-500 hover:text-amber-400 p-1 transition"
                    title="Редактировать пользователя"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteUser(user.id, user.telegramId);
                    }}
                    className="text-slate-500 hover:text-red-400 p-1 transition"
                    title="Удалить пользователя"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddUserModal isOpen={isAddUserModalOpen} onClose={() => setIsAddUserModalOpen(false)} />
      <EditUserModal user={editingUser} isOpen={!!editingUser} onClose={() => setEditingUser(null)} />
    </div>
  );
};
