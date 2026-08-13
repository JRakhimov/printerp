import React, { useState } from 'react';
import { useClients } from '../hooks/useClients';
import { useProjects } from '../hooks/useProjects';
import { useCreateOrder } from '../hooks/useOrders';
import { X, ShoppingBag, Plus, Trash2, Loader2, Calculator, Calendar, DollarSign } from 'lucide-react';

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateOrderModal: React.FC<CreateOrderModalProps> = ({ isOpen, onClose }) => {
  const { data: clients } = useClients();
  const { data: projects } = useProjects();
  const createOrder = useCreateOrder();

  const [clientId, setClientId] = useState<string>('');
  const [deadline, setDeadline] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [items, setItems] = useState<{ projectId: string; quantity: number }[]>([]);
  const [customFinalPrice, setCustomFinalPrice] = useState<string>('');
  const [initialPaymentAmount, setInitialPaymentAmount] = useState<string>('');
  const [initialPaymentComment, setInitialPaymentComment] = useState<string>('Deposit paid');

  if (!isOpen) return null;

  const projectMap = new Map((projects || []).map((p) => [p.id, p]));

  const addItemRow = () => {
    if (projects && projects.length > 0) {
      setItems([...items, { projectId: projects[0].id, quantity: 1 }]);
    }
  };

  const removeItemRow = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItemRow = (index: number, field: 'projectId' | 'quantity', value: string | number) => {
    const updated = [...items];
    if (field === 'projectId') updated[index].projectId = value as string;
    if (field === 'quantity') updated[index].quantity = Math.max(1, Number(value) || 1);
    setItems(updated);
  };

  // Live financial metrics
  let calculatedCost = 0;
  let calculatedPrice = 0;

  for (const item of items) {
    const proj = projectMap.get(item.projectId);
    if (proj) {
      calculatedCost += proj.defaultCost * item.quantity;
      calculatedPrice += proj.defaultPrice * item.quantity;
    }
  }

  const finalPrice = customFinalPrice !== '' ? Number(customFinalPrice) || 0 : calculatedPrice;
  const estimatedProfit = finalPrice - calculatedCost;
  const marginPercentage = finalPrice > 0 ? Math.round((estimatedProfit / finalPrice) * 100) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      alert('Please select a client');
      return;
    }
    if (items.length === 0) {
      alert('Please add at least one model item to the order');
      return;
    }

    try {
      await createOrder.mutateAsync({
        clientId,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        comment: comment || null,
        items,
        finalPrice: customFinalPrice !== '' ? Number(customFinalPrice) : undefined,
        initialPaymentAmount: initialPaymentAmount ? Number(initialPaymentAmount) : undefined,
        initialPaymentComment: initialPaymentComment || undefined,
      });

      // Reset form
      setClientId('');
      setDeadline('');
      setComment('');
      setItems([]);
      setCustomFinalPrice('');
      setInitialPaymentAmount('');
      onClose();
    } catch (err) {
      console.error('Failed to create order:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-5 shadow-2xl space-y-4 my-8">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
            Create New 3D Print Order
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Client Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Client *</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
              required
            >
              <option value="">Select a client...</option>
              {(clients || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.source})
                </option>
              ))}
            </select>
          </div>

          {/* Items Section */}
          <div className="border border-slate-800 rounded-xl p-3 bg-slate-950/50 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                Order Items (Models)
              </label>
              <button
                type="button"
                onClick={addItemRow}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </button>
            </div>

            {items.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic">No models added to this order yet.</p>
            ) : (
              <div className="space-y-2">
                {items.map((row, idx) => {
                  const proj = projectMap.get(row.projectId);
                  return (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={row.projectId}
                        onChange={(e) => updateItemRow(idx, 'projectId', e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      >
                        {(projects || []).map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({Number(p.defaultPrice).toLocaleString('ru-RU')} сум)
                          </option>
                        ))}
                      </select>

                      <div className="w-20 flex items-center">
                        <span className="text-[11px] text-slate-400 mr-1.5">Qty:</span>
                        <input
                          type="number"
                          min="1"
                          value={row.quantity}
                          onChange={(e) => updateItemRow(idx, 'quantity', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white text-center"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        className="text-slate-500 hover:text-red-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Financial Breakdown & Margin Box */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400 text-[11px]">Est. Cost:</span>
                <p className="font-semibold text-slate-200">{calculatedCost.toLocaleString('ru-RU')} сум</p>
              </div>
              <div>
                <span className="text-slate-400 text-[11px]">Catalog Price:</span>
                <p className="font-semibold text-slate-200">{calculatedPrice.toLocaleString('ru-RU')} сум</p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Final Agreed Price (сум)
                </label>
                <input
                  type="number"
                  placeholder={calculatedPrice.toString()}
                  value={customFinalPrice}
                  onChange={(e) => setCustomFinalPrice(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-emerald-400 font-bold placeholder-slate-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Estimated Profit & Margin</label>
                <div className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs flex items-center justify-between">
                  <span className="font-bold text-emerald-400">{estimatedProfit.toLocaleString('ru-RU')} сум</span>
                  <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded">
                    {marginPercentage}% margin
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Deadline & Deposit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                Target Deadline
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                Deposit Payment (сум)
              </label>
              <input
                type="number"
                placeholder="0"
                value={initialPaymentAmount}
                onChange={(e) => setInitialPaymentAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Comment / Special Request</label>
            <textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Infill percentage, color preference, urgent tag..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl text-xs text-slate-400 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createOrder.isPending}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition shadow-md shadow-emerald-500/20"
            >
              {createOrder.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Create Order</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
