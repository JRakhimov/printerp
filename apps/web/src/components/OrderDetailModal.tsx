import React, { useState, useEffect } from 'react';
import {
  useOrder,
  useUpdateOrder,
  useUpdateOrderStatus,
  useDeleteOrder,
  OrderStatus,
  PaymentStatus,
} from '../hooks/useOrders';
import { useClients } from '../hooks/useClients';
import { useProjects } from '../hooks/useProjects';
import {
  X,
  Calendar,
  DollarSign,
  Clock,
  Layers,
  User,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Pencil,
  Eye,
  Trash2,
  Save,
  MessageSquare,
  ShoppingBag,
  Plus,
  Box,
} from 'lucide-react';

interface OrderDetailModalProps {
  orderId: string | null;
  initialMode?: 'view' | 'edit';
  onClose: () => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  orderId,
  initialMode = 'view',
  onClose,
}) => {
  const { data: order, isLoading } = useOrder(orderId);
  const { data: clients } = useClients();
  const { data: projects } = useProjects();

  const updateOrder = useUpdateOrder();
  const updateStatus = useUpdateOrderStatus();
  const deleteOrder = useDeleteOrder();

  const [isEditing, setIsEditing] = useState<boolean>(initialMode === 'edit');
  const [statusComment, setStatusComment] = useState('');

  // Editable form fields
  const [editClientId, setEditClientId] = useState('');
  const [editFinalPrice, setEditFinalPrice] = useState<string>('');
  const [editDeadline, setEditDeadline] = useState('');
  const [editComment, setEditComment] = useState('');
  const [editStatus, setEditStatus] = useState<OrderStatus>(OrderStatus.CREATED);
  const [editItems, setEditItems] = useState<{ projectId: string; quantity: number | '' }[]>([]);

  useEffect(() => {
    setIsEditing(initialMode === 'edit');
  }, [initialMode, orderId]);

  useEffect(() => {
    if (order) {
      setEditClientId(order.clientId || '');
      setEditFinalPrice((order.finalPrice ?? order.calculatedPrice ?? 0).toString());
      setEditDeadline(order.deadline ? new Date(order.deadline).toISOString().split('T')[0] : '');
      setEditComment(order.comment || '');
      setEditStatus(order.status || OrderStatus.CREATED);
      setEditItems(
        order.items?.map((it) => ({
          projectId: it.projectId || '',
          quantity: it.quantity,
        })) || []
      );
    }
  }, [order]);

  if (!orderId) return null;

  const handleAddItem = () => {
    if (!projects || projects.length === 0) return;
    setEditItems((prev) => [...prev, { projectId: projects[0].id, quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (editItems.length <= 1) {
      alert('Order must contain at least one model item');
      return;
    }
    setEditItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: 'projectId' | 'quantity', value: any) => {
    setEditItems((prev) =>
      prev.map((item, i) => {
        if (i === index) {
          if (field === 'quantity') {
            return { ...item, quantity: value === '' ? '' : Math.max(1, Number(value) || 1) };
          }
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  // Live calculation for edit mode
  let editCalculatedCost = 0;
  let editCalculatedPrice = 0;
  if (projects && projects.length > 0) {
    editItems.forEach((it) => {
      const proj = projects.find((p) => p.id === it.projectId);
      const qty = typeof it.quantity === 'number' ? it.quantity : 1;
      if (proj) {
        editCalculatedCost += (proj.defaultCost || 0) * qty;
        editCalculatedPrice += (proj.defaultPrice || 0) * qty;
      }
    });
  }

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

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    if (editItems.length === 0) {
      alert('Please add at least one model item to the order');
      return;
    }

    try {
      const formattedItems = editItems.map((it) => ({
        projectId: it.projectId,
        quantity: typeof it.quantity === 'number' ? it.quantity : 1,
      }));

      // 1. Update basic details and items
      await updateOrder.mutateAsync({
        id: order.id,
        dto: {
          clientId: editClientId,
          items: formattedItems,
          finalPrice: editFinalPrice !== '' ? Number(editFinalPrice) : undefined,
          deadline: editDeadline ? new Date(editDeadline).toISOString() : null,
          comment: editComment || null,
        },
      });

      // 2. Update status if changed
      if (editStatus !== order.status) {
        await updateStatus.mutateAsync({
          id: order.id,
          dto: {
            status: editStatus,
          },
        });
      }

      setIsEditing(false);
    } catch (err: any) {
      console.error('Failed to update order:', err);
      alert(err.response?.data?.message || 'Failed to update order');
    }
  };

  const handleDeleteOrder = async () => {
    if (!order) return;
    if (window.confirm(`Are you sure you want to cancel/delete Order #${order.orderNumber}?`)) {
      try {
        await deleteOrder.mutateAsync(order.id);
        onClose();
      } catch (err: any) {
        console.error('Failed to delete order:', err);
        alert(err.response?.data?.message || 'Failed to delete order');
      }
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
                  {isEditing ? 'Edit Order Details' : order.client?.name}
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center space-x-1 text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-emerald-500/20 transition"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Edit Order</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex items-center space-x-1 text-xs text-slate-400 hover:text-white bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Mode</span>
                  </button>
                )}
                <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* MODE 1: READ-ONLY VIEW MODE */}
            {!isEditing && (
              <div className="space-y-4">
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
                            isActive
                              ? opt.color + ' font-bold ring-1 ring-white/20'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
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
                      <div
                        key={item.id}
                        className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between"
                      >
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
                          <span className="text-[10px] text-slate-400">
                            Cost: {item.totalCost.toLocaleString('ru-RU')} сум
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Financial & Payment Summary */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Total Price:</span>
                    <span className="font-bold text-white">
                      {Number(order.finalPrice ?? order.calculatedPrice ?? 0).toLocaleString('ru-RU')} сум
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Est. Cost:</span>
                    <span className="font-semibold text-slate-300">
                      {order.calculatedCost.toLocaleString('ru-RU')} сум
                    </span>
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
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          order.paymentStatus === PaymentStatus.PAID
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : order.paymentStatus === PaymentStatus.PARTIALLY_PAID
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}
                      >
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {order.deadline && (
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-amber-400" />
                      <div>
                        <span className="text-[10px] text-slate-400 block">Deadline</span>
                        <span className="font-semibold text-slate-200">
                          {new Date(order.deadline).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  )}
                  {order.comment && (
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 col-span-1 sm:col-span-2">
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
                        <div
                          key={ev.id}
                          className="text-[11px] bg-slate-950 p-2 rounded-lg border border-slate-800 flex items-center justify-between text-slate-400"
                        >
                          <span>
                            Status changed: <strong className="text-white">{ev.newValue}</strong>
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(ev.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MODE 2: EDITABLE FORM MODE */}
            {isEditing && (
              <form onSubmit={handleSaveOrder} className="space-y-4">
                {/* Client Select */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Client *</label>
                  <select
                    value={editClientId}
                    onChange={(e) => setEditClientId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    required
                  >
                    {(clients || []).map((c) => {
                      const info = c.instagramUsername || c.telegramUsername || c.notes || c.city || c.phone || c.source;
                      return (
                        <option key={c.id} value={c.id}>
                          {c.name} {info ? `(${info})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Models / Order Items Editor */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Box className="w-3.5 h-3.5 text-indigo-400" />
                      Order Models & Items ({editItems.length})
                    </label>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1 rounded-lg border border-indigo-500/20 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Model</span>
                    </button>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {editItems.map((item, idx) => {
                      const selectedProj = projects?.find((p) => p.id === item.projectId);
                      const unitCost = selectedProj?.defaultCost || 0;
                      const unitPrice = selectedProj?.defaultPrice || 0;
                      const qty = typeof item.quantity === 'number' ? item.quantity : 1;
                      const lineTotal = unitPrice * qty;

                      return (
                        <div
                          key={idx}
                          className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex items-center gap-2"
                        >
                          <select
                            value={item.projectId}
                            onChange={(e) => handleItemChange(idx, 'projectId', e.target.value)}
                            className="flex-1 min-w-0 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none truncate"
                            required
                          >
                            {(projects || []).map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.defaultPrice.toLocaleString('ru-RU')} сум)
                              </option>
                            ))}
                          </select>

                          <div className="w-28 shrink-0 flex items-center bg-slate-900 border border-slate-800 rounded-lg px-2 py-1">
                            <span className="text-[11px] text-slate-400 mr-1.5 shrink-0">Qty:</span>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                              className="w-full bg-transparent text-xs font-bold text-white focus:outline-none text-right"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-slate-500 hover:text-rose-400 p-1 shrink-0"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Order Status Select */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Order Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as OrderStatus)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-emerald-400 font-bold focus:border-emerald-500 focus:outline-none"
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.status} value={opt.status}>
                        {opt.label} ({opt.status})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price & Deadline Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                      <span>Agreed Price (сум)</span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        Cat: {editCalculatedPrice.toLocaleString('ru-RU')}
                      </span>
                    </label>
                    <input
                      type="number"
                      value={editFinalPrice}
                      onChange={(e) => setEditFinalPrice(e.target.value)}
                      placeholder={editCalculatedPrice.toString()}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-emerald-400 font-bold focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      Target Deadline
                    </label>
                    <input
                      type="date"
                      value={editDeadline}
                      onChange={(e) => setEditDeadline(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Comment / Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Comment / Special Request</label>
                  <textarea
                    rows={2}
                    value={editComment}
                    onChange={(e) => setEditComment(e.target.value)}
                    placeholder="Infill percentage, color preference, notes..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={handleDeleteOrder}
                    disabled={deleteOrder.isPending}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 flex items-center gap-1 transition"
                  >
                    {deleteOrder.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>Cancel Order</span>
                  </button>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-2 rounded-xl text-xs text-slate-400 hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={updateOrder.isPending || updateStatus.isPending}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition shadow-md shadow-emerald-500/20"
                    >
                      {(updateOrder.isPending || updateStatus.isPending) ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>Save Changes</span>
                    </button>
                  </div>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};
