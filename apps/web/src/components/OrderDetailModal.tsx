import React, { useState } from 'react';
import { useOrder, useUpdateOrderStatus, OrderStatus, PaymentStatus } from '../hooks/useOrders';
import { X, Calendar, DollarSign, Clock, Layers, User, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface OrderDetailModalProps {
  orderId: string | null;
  onClose: () => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ orderId, onClose }) => {
  const { data: order, isLoading } = useOrder(orderId);
  const updateStatus = useUpdateOrderStatus();
  const [statusComment, setStatusComment] = useState('');

  if (!orderId) return null;

  const handleStatusChange = async (newStatus: OrderStatus) => {
    try {
      await updateStatus.mutateAsync({
        id: orderId,
        dto: {
          status: newStatus,
          comment: statusComment || undefined,
        },
      });
      setStatusComment('');
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const statusOptions: { status: OrderStatus; label: string; color: string }[] = [
    { status: OrderStatus.CREATED, label: 'Created', color: 'bg-slate-800 text-slate-300' },
    { status: OrderStatus.DESIGN, label: '3D Design', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
    { status: OrderStatus.PRINTING, label: 'Printing', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    { status: OrderStatus.PRINTED, label: 'Printed', color: 'bg-sky-500/20 text-sky-400 border-sky-500/30' },
    { status: OrderStatus.COMPLETED, label: 'Completed', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    { status: OrderStatus.CANCELLED, label: 'Cancelled', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  ];

  const totalPaid = order?.payments?.reduce((acc, p) => acc + p.amount, 0) || 0;
  const remainingPayment = (order?.finalPrice || 0) - totalPaid;
  const profit = (order?.finalPrice || 0) - (order?.calculatedCost || 0);
  const marginPercentage = (order?.finalPrice || 0) > 0 ? Math.round((profit / (order?.finalPrice || 1)) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-5 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
        {isLoading || !order ? (
          <div className="py-12 flex justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono text-emerald-400 font-bold">#100{order.orderNumber}</span>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-400" />
                  {order.client?.name}
                </h3>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Status Pipeline Buttons */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-slate-400">Update Order Status:</label>
              <div className="flex flex-wrap gap-1.5">
                {statusOptions.map((opt) => {
                  const isActive = order.status === opt.status;
                  return (
                    <button
                      key={opt.status}
                      onClick={() => handleStatusChange(opt.status)}
                      disabled={updateStatus.isPending}
                      className={`text-[11px] font-medium px-2.5 py-1 rounded-xl border transition ${
                        isActive ? opt.color + ' font-bold ring-1 ring-white/20' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Order Items List */}
            <div className="border border-slate-800 rounded-xl p-3 bg-slate-950/50 space-y-2">
              <span className="text-xs font-semibold text-slate-300">Models & Items ({order.items.length})</span>
              <div className="space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white">{item.projectNameSnapshot}</h4>
                      <p className="text-[10px] text-slate-400">
                        {item.quantity}x @ {item.unitPrice.toLocaleString('ru-RU')} сум
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-white block">
                        {item.totalPrice.toLocaleString('ru-RU')} сум
                      </span>
                      <span className="text-[10px] text-slate-400">Cost: {item.totalCost.toLocaleString('ru-RU')} сум</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial & Payment Summary */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Total Price:</span>
                <span className="font-bold text-white">{order.finalPrice.toLocaleString('ru-RU')} сум</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Est. Cost:</span>
                <span className="font-semibold text-slate-300">{order.calculatedCost.toLocaleString('ru-RU')} сум</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
                <span className="text-slate-400">Est. Net Profit:</span>
                <span className="font-bold text-emerald-400">
                  {profit.toLocaleString('ru-RU')} сум ({marginPercentage}% margin)
                </span>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Payment:</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    order.paymentStatus === PaymentStatus.PAID ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    order.paymentStatus === PaymentStatus.PARTIALLY_PAID ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                    {order.paymentStatus}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-300">Paid: {totalPaid.toLocaleString('ru-RU')} сум</span>
                  {remainingPayment > 0 && (
                    <span className="block text-[10px] text-amber-400 font-medium">
                      Due: {remainingPayment.toLocaleString('ru-RU')} сум
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Comment & Deadline */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              {order.deadline && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <div>
                    <span className="text-[10px] text-slate-400 block">Deadline</span>
                    <span className="font-semibold text-slate-200">{new Date(order.deadline).toLocaleDateString()}</span>
                  </div>
                </div>
              )}
              {order.comment && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 col-span-2">
                  <span className="text-[10px] text-slate-400 block font-semibold">Notes / Comment</span>
                  <p className="text-xs text-slate-300">{order.comment}</p>
                </div>
              )}
            </div>

            {/* Audit Log Events */}
            {order.events && order.events.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400">Order History & Events:</span>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {order.events.map((ev) => (
                    <div key={ev.id} className="text-[11px] bg-slate-950 p-2 rounded-lg border border-slate-800 flex items-center justify-between text-slate-400">
                      <span>Status changed: <strong className="text-white">{ev.newValue}</strong></span>
                      <span className="text-[10px] text-slate-500">{new Date(ev.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
