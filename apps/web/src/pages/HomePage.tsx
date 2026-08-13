import React from 'react';
import { useOrders, OrderStatus } from '../hooks/useOrders';
import { useFinancialSummary } from '../hooks/useFinance';
import {
  Package,
  Printer,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Layers,
  CalendarPlus,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { data: orders } = useOrders();
  const { data: summary } = useFinancialSummary();

  // Active orders count & printing status count
  const activeOrders = orders?.filter((o) => o.status !== OrderStatus.COMPLETED && o.status !== OrderStatus.CANCELLED) || [];
  const printingCount = orders?.filter((o) => o.status === OrderStatus.PRINTING).length || 0;

  // Orders created today count
  const todayOrdersCount = orders?.filter((o) => {
    const createdDate = new Date(o.createdAt);
    const now = new Date();
    return (
      createdDate.getFullYear() === now.getFullYear() &&
      createdDate.getMonth() === now.getMonth() &&
      createdDate.getDate() === now.getDate()
    );
  }).length || 0;

  // Revenue & Net profit from live finance summary
  const revenue = summary?.revenue ?? 0;
  const netProfit = summary?.netProfit ?? 0;
  const marginPercentage = summary?.marginPercentage ?? 0;

  // Upcoming deadlines (next active orders with deadline sorted ascending)
  const upcomingDeadlines = activeOrders
    .filter((o) => !!o.deadline)
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime());

  return (
    <div className="space-y-4 pb-20">
      {/* Quick Dashboard Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-blue-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Orders</span>
            <Package className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-white">
            {printingCount}/{activeOrders.length}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {printingCount} printing / {activeOrders.length} active
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Net Profit</span>
            <TrendingUp className="w-4 h-4" />
          </div>
          <p className="text-xl font-bold text-emerald-400">{netProfit.toLocaleString('ru-RU')} сум</p>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>Rev: {revenue.toLocaleString('ru-RU')}</span>
            <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              {marginPercentage}%
            </span>
          </p>
        </div>
      </div>

      {/* Orders Created Today Block (Shown ONLY if todayOrdersCount > 0) */}
      {todayOrdersCount > 0 && (
        <div className="bg-slate-900 border border-sky-500/30 rounded-2xl p-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <CalendarPlus className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-sky-400/90 tracking-wider block">
                Orders Created Today
              </span>
              <span className="text-sm font-bold text-white">
                {todayOrdersCount} {todayOrdersCount === 1 ? 'order created' : 'orders created'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Stock Asset Block */}
      {summary && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Layers className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
                Inventory Assets Stock
              </span>
              <span className="text-sm font-bold text-white">
                {summary.inventoryValuation.toLocaleString('ru-RU')} сум
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Unpaid Client Balance Block (Shown ONLY if unpaidBalance > 0) */}
      {summary && summary.unpaidBalance > 0 && (
        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <DollarSign className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-amber-400/90 tracking-wider block">
                Unpaid Client Balance
              </span>
              <span className="text-sm font-bold text-amber-400">
                {summary.unpaidBalance.toLocaleString('ru-RU')} сум
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Deadlines Overview */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          Upcoming Deadlines
        </h2>
        {upcomingDeadlines.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No upcoming deadlines.</p>
        ) : (
          <div className="space-y-2">
            {upcomingDeadlines.slice(0, 3).map((order) => {
              const daysLeft = Math.ceil(
                (new Date(order.deadline!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
              );
              return (
                <div key={order.id} className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-mono text-emerald-400 font-bold">#100{order.orderNumber}</span>
                    <p className="text-xs font-semibold text-slate-200">
                      {order.client?.name} — {order.items.length} items
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-medium text-amber-400">
                      {new Date(order.deadline!).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                    <p className="text-[10px] text-slate-400">{daysLeft} days remaining</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
