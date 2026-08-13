import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UpdateUserSchema, UpdateUserDto, Role } from '@printerp/shared';
import { UserItem, useUpdateUser, useDeleteUser } from '../hooks/useUsers';
import { X, UserCheck, Shield, Loader2, Send, Trash2, CheckCircle2, XCircle } from 'lucide-react';

interface EditUserModalProps {
  user: UserItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({ user, isOpen, onClose }) => {
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UpdateUserDto>({
    resolver: zodResolver(UpdateUserSchema),
  });

  const isActive = watch('isActive');

  useEffect(() => {
    if (user) {
      reset({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        telegramUsername: user.telegramUsername || '',
        role: user.role,
        isActive: user.isActive,
      });
    }
  }, [user, reset]);

  if (!isOpen || !user) return null;

  const handleToggleActive = () => {
    const nextState = !isActive;
    if (!nextState) {
      const name = user.firstName || user.telegramUsername || `ID: ${user.telegramId}`;
      if (!window.confirm(`Вы уверены, что хотите деактивировать пользователя "${name}"?`)) {
        return;
      }
    }
    setValue('isActive', nextState, { shouldDirty: true });
  };

  const onSubmit = async (data: UpdateUserDto) => {
    try {
      await updateUser.mutateAsync({ id: user.id, dto: data });
      onClose();
    } catch (err: any) {
      console.error('Failed to update user:', err);
      alert(err.response?.data?.message || 'Failed to update user information');
    }
  };

  const handleDelete = async () => {
    const name = user.firstName || user.telegramUsername || `ID: ${user.telegramId}`;
    if (window.confirm(`Are you sure you want to remove user "${name}" (Telegram ID: ${user.telegramId}) from allowlist?`)) {
      try {
        await deleteUser.mutateAsync(user.id);
        onClose();
      } catch (err: any) {
        console.error('Failed to delete user:', err);
        alert(err.response?.data?.message || 'Failed to delete user');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-5 shadow-2xl space-y-4 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-amber-400" />
              Edit Team Member
            </h3>
            <p className="text-[11px] text-slate-400">ID: {user.telegramId}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          {/* Telegram ID (Readonly) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Telegram ID
            </label>
            <input
              type="text"
              value={user.telegramId}
              disabled
              className="w-full bg-slate-950/50 border border-slate-800/80 rounded-xl px-3 py-2 text-xs text-slate-400 font-mono cursor-not-allowed"
            />
          </div>

          {/* Telegram Username */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
              <Send className="w-3.5 h-3.5 text-sky-400" />
              Telegram Username
            </label>
            <input
              {...register('telegramUsername')}
              placeholder="e.g. operator_john"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* First Name & Last Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">First Name</label>
              <input
                {...register('firstName')}
                placeholder="John"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Last Name</label>
              <input
                {...register('lastName')}
                placeholder="Smith"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              Role
            </label>
            <select
              {...register('role')}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
            >
              <option value={Role.USER}>USER (Workshop Operator)</option>
              <option value={Role.OWNER}>OWNER (Full Admin Access)</option>
            </select>
          </div>

          {/* Active Status Switch */}
          <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl p-3">
            <div>
              <span className="text-xs font-semibold text-white block">Account Access Status</span>
              <span className="text-[10px] text-slate-400">Toggle whether this user can log into the system</span>
            </div>
            <button
              type="button"
              onClick={handleToggleActive}
              className={`text-xs font-semibold px-3 py-1 rounded-full border flex items-center gap-1 transition ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
              }`}
            >
              {isActive ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Active
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5" /> Disabled
                </>
              )}
            </button>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteUser.isPending}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 flex items-center gap-1 transition"
            >
              {deleteUser.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              <span>Remove</span>
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-xl text-xs text-slate-400 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateUser.isPending}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 transition shadow-md shadow-amber-500/20"
              >
                {updateUser.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
