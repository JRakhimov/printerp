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
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
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
      alert('Financial settings saved successfully!');
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
    if (confirm(`Are you sure you want to remove user (Telegram ID: ${telegramId}) from allowlist?`)) {
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
            System Settings
          </h2>
          <p className="text-xs text-slate-400">Pricing rules, financial constants & team access allowlist</p>
        </div>
      </div>

      {/* Financial Constants & Pricing Rules Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <h3 className="text-xs font-bold text-white flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            Financial Constants & Pricing Rules
          </h3>
          <span className="text-[10px] bg-slate-800 text-slate-300 font-semibold px-2 py-0.5 rounded-md">
            Currency: UZS (сум)
          </span>
        </div>

        {isFinLoading ? (
          <div className="py-6 flex justify-center text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSaveFinancial)} className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              {/* Default Markup % */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 text-emerald-400" />
                  Default Profit Markup (%)
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
                  Electricity Rate (сум/кВт·ч)
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
                  Labor/Design Rate (сум/час)
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
                <span>Save Financial Constants</span>
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
              Team Access Allowlist & Roles
            </h3>
            <p className="text-[11px] text-slate-400">Telegram accounts authorized to access workshop ERP</p>
          </div>
          <button
            onClick={() => setIsAddUserModalOpen(true)}
            className="flex items-center space-x-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition shadow-md shadow-amber-500/20"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Member</span>
          </button>
        </div>

        {isUsersLoading ? (
          <div className="py-8 flex justify-center text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
          </div>
        ) : users?.length === 0 ? (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-center text-slate-500 text-xs">
            No team members added yet.
          </div>
        ) : (
          <div className="space-y-2.5">
            {users?.map((user) => (
              <div
                key={user.id}
                onClick={() => setEditingUser(user)}
                className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs hover:border-slate-700 transition cursor-pointer group"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white group-hover:text-amber-400 transition">
                      {user.firstName || user.telegramUsername || `ID: ${user.telegramId}`}
                    </span>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        user.role === Role.OWNER
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      }`}
                    >
                      {user.role}
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
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3" /> Disabled
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
                  <select
                    value={user.role}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleChangeRole(user.id, e.target.value as Role);
                    }}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-200 focus:outline-none"
                  >
                    <option value={Role.USER}>USER</option>
                    <option value={Role.OWNER}>OWNER</option>
                  </select>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingUser(user);
                    }}
                    className="text-slate-500 hover:text-amber-400 p-1 transition"
                    title="Edit user details"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteUser(user.id, user.telegramId);
                    }}
                    className="text-slate-500 hover:text-red-400 p-1 transition"
                    title="Delete user"
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
