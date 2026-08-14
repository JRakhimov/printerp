import React, { useState } from 'react';
import { useOrders, OrderStatus, PaymentStatus } from '../hooks/useOrders';
import { getClientDisplayName } from '@printerp/shared';
import { CreateOrderModal } from '../components/CreateOrderModal';
import { OrderDetailModal } from '../components/OrderDetailModal';
import { ShoppingBag, Plus, Search, Calendar, User, Clock, Loader2, Filter, AlertCircle, Pencil, Zap } from 'lucide-react';

export const OrdersPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | undefined>(undefined);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderModalMode, setOrderModalMode] = useState<'view' | 'edit'>('view');

  const { data: orders, isLoading } = useOrders({
    status: statusFilter,
    search: search || undefined,
  });

  const handleOpenDetail = (id: string, mode: 'view' | 'edit' = 'view') => {
    setSelectedOrderId(id);
    setOrderModalMode(mode);
  };

  const handleEdit = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    handleOpenDetail(id, 'edit');
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.CREATED:
        return 'bg-slate-800 text-slate-300 border-slate-700';
      case OrderStatus.DESIGN:
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case OrderStatus.PRINTING:
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case OrderStatus.PRINTED:
        return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case OrderStatus.COMPLETED:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case OrderStatus.CANCELLED:
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.CREATED:
        return 'СОЗДАН';
      case OrderStatus.DESIGN:
        return 'ДИЗАЙН';
      case OrderStatus.PRINTING:
        return 'В ПЕЧАТИ';
      case OrderStatus.PRINTED:
        return 'НАПЕЧАТАН';
      case OrderStatus.COMPLETED:
        return 'ВЫПОЛНЕН';
      case OrderStatus.CANCELLED:
        return 'ОТМЕНЁН';
      default:
        return status;
    }
  };

  const getPaymentStatusLabel = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.PAID:
        return 'ОПЛАЧЕН';
      case PaymentStatus.PARTIALLY_PAID:
        return 'ЧАСТИЧНО';
      case PaymentStatus.UNPAID:
        return 'НЕ ОПЛАЧЕН';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header action bar */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-emerald-400" />
          Заказы
        </h2>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-2 rounded-xl transition shadow-md shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Новый заказ</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по клиенту, комментарию или модели..."
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setStatusFilter(undefined)}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
            statusFilter === undefined ? 'bg-emerald-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          Все заказы
        </button>
        <button
          onClick={() => setStatusFilter(OrderStatus.PRINTING)}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
            statusFilter === OrderStatus.PRINTING ? 'bg-amber-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          В печати
        </button>
        <button
          onClick={() => setStatusFilter(OrderStatus.PRINTED)}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
            statusFilter === OrderStatus.PRINTED ? 'bg-sky-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          Напечатано
        </button>
        <button
          onClick={() => setStatusFilter(OrderStatus.COMPLETED)}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
            statusFilter === OrderStatus.COMPLETED ? 'bg-emerald-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          Выполнены
        </button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="py-12 flex justify-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && orders?.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 space-y-2">
          <ShoppingBag className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-sm font-medium">Заказы не найдены</p>
          <p className="text-xs text-slate-500">Создайте первый заказ клиента, чтобы начать отслеживание печати.</p>
        </div>
      )}

      {/* Orders List */}
      <div className="space-y-3">
        {orders?.map((order) => {
          return (
            <div
              key={order.id}
              onClick={() => handleOpenDetail(order.id, 'view')}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-sm cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <span className="text-xs font-mono text-emerald-400 font-bold">#100{order.orderNumber}</span>
                    <h3 className="text-sm font-bold text-white">{getClientDisplayName(order.client)}</h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {order.items?.map((i) => `${i.projectNameSnapshot} (${i.quantity}x)`).join(', ')}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-xl border ${getStatusBadge(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </span>
                  <button
                    onClick={(e) => handleEdit(e, order.id)}
                    className="text-slate-400 hover:text-emerald-400 p-1"
                    title="Редактировать заказ"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Order Footer summary */}
              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                <div className="flex items-center space-x-3 text-[11px]">
                  <span className="font-bold text-white">
                    {Number(order.finalPrice ?? order.calculatedPrice ?? 0).toLocaleString('ru-RU')} сум
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    order.paymentStatus === PaymentStatus.PAID ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    order.paymentStatus === PaymentStatus.PARTIALLY_PAID ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                    {getPaymentStatusLabel(order.paymentStatus)}
                  </span>
                </div>

                <div className="text-right space-y-0.5">
                  {order.deadline && (
                    <span className="flex items-center justify-end gap-1 text-[11px] text-amber-400 font-medium">
                      <Zap className="w-3 h-3 text-amber-400 fill-amber-400/20" />
                      {new Date(order.deadline).toLocaleDateString('ru-RU')}
                    </span>
                  )}
                  {order.createdAt && (
                    <span className="flex items-center justify-end gap-1 text-[10px] text-slate-400 font-medium">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      {new Date(order.createdAt).toLocaleDateString('ru-RU')}{' '}
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <CreateOrderModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
      <OrderDetailModal
        orderId={selectedOrderId}
        initialMode={orderModalMode}
        onClose={() => setSelectedOrderId(null)}
      />
    </div>
  );
};
